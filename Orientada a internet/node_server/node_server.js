const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost",
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io/",
});

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root",
  database: "simulador",
};

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
  if (err) {
    console.error("Error conectando a la BD:", err);
    return;
  }
  console.log("Conectado a la base de datos MySQL");
});

const usuariosConectados = new Map();
const usuariosEscribiendo = new Map();

const usuariosEscribiendoGrupo = new Map();

function limpiarEstadosEscribiendoAntiguos() {
  const ahora = Date.now();
  let limpiados = 0;

  usuariosEscribiendoGrupo.forEach((valor, usuarioId) => {
    if (ahora - valor.timestamp > 8000) {
      usuariosEscribiendoGrupo.delete(usuarioId);
      limpiados++;

      const salaGrupo = `grupo_${valor.grupo_id}`;
      io.to(salaGrupo).emit("estado_escribiendo_grupo", {
        usuario_id: usuarioId,
        grupo_id: valor.grupo_id,
        escribiendo: false,
        usuario_nombre: valor.nombre,
      });

      console.log(
        `🧹 Limpiado estado escribiendo automático para usuario ${usuarioId}`
      );
    }
  });

  if (limpiados > 0) {
    console.log(`✅ Limpiados ${limpiados} estados escribiendo antiguos`);
  }
}

setInterval(limpiarEstadosEscribiendoAntiguos, 3000);

function obtenerUltimoMensaje(usuario1, usuario2, callback) {
  const query = `
    SELECT mensaje, remitente_id, fecha_envio 
    FROM mensajes 
    WHERE (remitente_id = ? AND destinatario_id = ?) 
       OR (remitente_id = ? AND destinatario_id = ?) 
    ORDER BY fecha_envio DESC 
    LIMIT 1
  `;

  db.execute(
    query,
    [usuario1, usuario2, usuario2, usuario1],
    (err, results) => {
      if (err) {
        console.error("Error obteniendo último mensaje:", err);
        callback(null);
        return;
      }

      if (results.length > 0) {
        callback(results[0]);
      } else {
        callback(null);
      }
    }
  );
}

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("registrar_usuario", (usuario_id) => {
    const usuarioId = parseInt(usuario_id);
    usuariosConectados.set(usuarioId, {
      socket_id: socket.id,
      escribiendo: false,
    });

    socket.usuario_id = usuarioId;
    socket.join(`user_${usuario_id}`);

    console.log(
      `✅ Usuario ${usuario_id} registrado. Conectados:`,
      Array.from(usuariosConectados.keys())
    );

    actualizarEstadosGlobales();
    socket.emit(
      "lista_usuarios_conectados",
      Array.from(usuariosConectados.keys())
    );
  });

  socket.on("unirse_chat", (data) => {
    const { usuario_id, destinatario_id } = data;
    const sala = `chat_${[usuario_id, destinatario_id].sort().join("_")}`;
    socket.join(sala);
    console.log(`Usuario ${usuario_id} se unió a la sala: ${sala}`);
  });

  socket.on("usuario_escribiendo", (data) => {
    const { usuario_id, destinatario_id, escribiendo } = data;
    const usuarioId = parseInt(usuario_id);
    const destinatarioId = parseInt(destinatario_id);

    console.log(
      `✍️ Usuario ${usuario_id} ${
        escribiendo ? "empezó" : "dejó de"
      } escribir a ${destinatario_id}`
    );

    if (escribiendo) {
      usuariosEscribiendo.set(usuarioId, destinatarioId);
    } else {
      usuariosEscribiendo.delete(usuarioId);
    }

    actualizarEstadosGlobales();

    const salaDestinatario = `user_${destinatario_id}`;
    io.to(salaDestinatario).emit("estado_escribiendo", {
      usuario_id: usuarioId,
      destinatario_id: destinatarioId,
      escribiendo: escribiendo,
    });
  });

  socket.on("usuario_escribiendo_grupo", (data) => {
    const { usuario_id, grupo_id, escribiendo } = data;
    const usuarioId = parseInt(usuario_id);
    const grupoId = parseInt(grupo_id);

    console.log(
      `✍️ Usuario ${usuario_id} ${
        escribiendo ? "empezó" : "dejó de"
      } escribir en grupo ${grupo_id}`
    );

    const nombreQuery = "SELECT nombre FROM usuario WHERE id = ?";
    db.execute(nombreQuery, [usuario_id], (err, results) => {
      if (err) {
        console.error("Error obteniendo nombre del usuario:", err);
        return;
      }

      const usuario_nombre =
        results.length > 0 ? results[0].nombre : `Usuario ${usuario_id}`;

      if (escribiendo) {
        usuariosEscribiendoGrupo.set(usuarioId, {
          grupo_id: grupoId,
          timestamp: Date.now(),
          nombre: usuario_nombre,
        });
      } else {
        usuariosEscribiendoGrupo.delete(usuarioId);
      }

      const salaGrupo = `grupo_${grupo_id}`;
      io.to(salaGrupo).emit("estado_escribiendo_grupo", {
        usuario_id: usuarioId,
        grupo_id: grupoId,
        escribiendo: escribiendo,
        usuario_nombre: usuario_nombre,
      });

      console.log(
        `📤 Notificado grupo ${grupo_id} sobre estado escribiendo de ${usuario_nombre}: ${escribiendo}`
      );
    });
  });

  socket.on("enviar_mensaje", async (data) => {
    console.log("📨 Mensaje recibido en socket:", data);

    const {
      remitente_id,
      destinatario_id,
      mensaje,
      tipo_mensaje,
      ubicacion_lat,
      ubicacion_lng,
      ubicacion_nombre,
      archivoNombre,
      archivoTipo,
      archivoSize,
      archivoPath,
    } = data;

    usuariosEscribiendo.delete(parseInt(remitente_id));
    actualizarEstadosGlobales();

    try {
      const query = `
      INSERT INTO mensajes 
        (remitente_id, destinatario_id, mensaje, tipo_mensaje, 
         ubicacion_lat, ubicacion_lng, ubicacion_nombre,
         archivoNombre, archivoTipo, archivoSize, archivoPath) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      db.execute(
        query,
        [
          remitente_id,
          destinatario_id,
          mensaje,
          tipo_mensaje || "texto",
          ubicacion_lat || null,
          ubicacion_lng || null,
          ubicacion_nombre || null,
          archivoNombre || null,
          archivoTipo || null,
          archivoSize || null,
          archivoPath || null,
        ],
        (err, results) => {
          if (err) {
            console.error("Error guardando mensaje:", err);
            socket.emit("error_mensaje", {
              error: "No se pudo guardar el mensaje",
            });
            return;
          }

          console.log("✅ Mensaje guardado en BD, ID:", results.insertId);

          const mensajeCompleto = {
            id: results.insertId,
            remitente_id,
            destinatario_id,
            mensaje,
            tipo_mensaje: tipo_mensaje || "texto",
            ubicacion_lat: ubicacion_lat || null,
            ubicacion_lng: ubicacion_lng || null,
            ubicacion_nombre: ubicacion_nombre || null,
            archivoNombre: archivoNombre || null,
            archivoTipo: archivoTipo || null,
            archivoSize: archivoSize || null,
            archivoPath: archivoPath || null,
            fecha_envio: new Date().toISOString(),
          };

          const sala = `chat_${[remitente_id, destinatario_id]
            .sort()
            .join("_")}`;
          io.to(sala).emit("nuevo_mensaje", mensajeCompleto);

          obtenerUltimoMensaje(
            remitente_id,
            destinatario_id,
            (ultimoMensaje) => {
              if (ultimoMensaje) {
                io.to(`user_${remitente_id}`).emit("actualizar_lista_chats", {
                  usuario_id: destinatario_id,
                  ultimo_mensaje: ultimoMensaje.mensaje,
                  es_mio: ultimoMensaje.remitente_id === remitente_id,
                  fecha_envio: ultimoMensaje.fecha_envio,
                });
              }
            }
          );

          obtenerUltimoMensaje(
            destinatario_id,
            remitente_id,
            (ultimoMensaje) => {
              if (ultimoMensaje) {
                io.to(`user_${destinatario_id}`).emit(
                  "actualizar_lista_chats",
                  {
                    usuario_id: remitente_id,
                    ultimo_mensaje: ultimoMensaje.mensaje,
                    es_mio: ultimoMensaje.remitente_id === destinatario_id,
                    fecha_envio: ultimoMensaje.fecha_envio,
                  }
                );
              }
            }
          );

          console.log("✅ Mensaje enviado y lista de chats actualizada");
        }
      );
    } catch (error) {
      console.error("❌ Error inesperado:", error);
      socket.emit("error_mensaje", { error: "Error del servidor" });
    }
  });

  socket.on("enviar_mensaje_grupo", (data) => {
    const {
      grupo_id,
      remitente_id,
      mensaje,
      tipo_mensaje,
      ubicacion_lat,
      ubicacion_lng,
      ubicacion_nombre,
      archivoNombre,
      archivoTipo,
      archivoSize,
      archivoPath,
    } = data;

    console.log("📨 Mensaje de grupo recibido:", {
      grupo_id,
      remitente_id,
      mensaje,
      tipo_mensaje,
      tiene_ubicacion: !!ubicacion_lat,
      tiene_archivo: !!archivoNombre,
      archivoNombre,
      archivoTipo,
    });

    const nombreQuery = "SELECT nombre FROM usuario WHERE id = ?";
    db.execute(nombreQuery, [remitente_id], (err, results) => {
      if (err) {
        console.error("Error obteniendo nombre del remitente:", err);
        return;
      }

      const remitente_nombre =
        results.length > 0 ? results[0].nombre : "Usuario";

      const query = `
      INSERT INTO mensajes_grupo 
      (grupo_id, remitente_id, mensaje, tipo_mensaje, 
       ubicacion_lat, ubicacion_lng, ubicacion_nombre,
       archivoNombre, archivoTipo, archivoSize, archivoPath) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      db.execute(
        query,
        [
          grupo_id,
          remitente_id,
          mensaje,
          tipo_mensaje || "texto",
          ubicacion_lat || null,
          ubicacion_lng || null,
          ubicacion_nombre || null,
          archivoNombre || null,
          archivoTipo || null,
          archivoSize || null,
          archivoPath || null,
        ],
        (err, results) => {
          if (err) {
            console.error("Error guardando mensaje de grupo:", err);
            socket.emit("error_mensaje", {
              error: "No se pudo guardar el mensaje",
            });
            return;
          }

          console.log(
            "✅ Mensaje de grupo guardado en BD, ID:",
            results.insertId
          );

          const mensajeCompleto = {
            id: results.insertId,
            grupo_id,
            remitente_id,
            remitente_nombre: remitente_nombre,
            mensaje,
            tipo_mensaje: tipo_mensaje || "texto",
            ubicacion_lat: ubicacion_lat || null,
            ubicacion_lng: ubicacion_lng || null,
            ubicacion_nombre: ubicacion_nombre || null,
            archivoNombre: archivoNombre || null,
            archivoTipo: archivoTipo || null,
            archivoSize: archivoSize || null,
            archivoPath: archivoPath || null,
            fecha_envio: new Date().toISOString(),
          };

          const salaGrupo = `grupo_${grupo_id}`;
          io.to(salaGrupo).emit("nuevo_mensaje_grupo", mensajeCompleto);
          io.to(salaGrupo).emit("actualizar_lista_chats", {
            es_grupo: true,
            grupo_id: grupo_id,
            ultimo_mensaje: mensaje,
            es_mio: false,
            fecha_envio: new Date().toISOString(),
          });

          console.log("✅ Mensaje de grupo enviado a sala:", salaGrupo);
        }
      );
    });
  });

  socket.on("unirse_grupo", (data) => {
    const { grupo_id, usuario_id } = data;
    const salaGrupo = `grupo_${grupo_id}`;
    socket.join(salaGrupo);
    console.log(`Usuario ${usuario_id} se unió a grupo: ${salaGrupo}`);
  });

  socket.on("iniciar_videollamada", (data) => {
    const { remitente_id, destinatario_id, remitente_nombre } = data;
    console.log(
      `📞 Videollamada iniciada de ${remitente_id} a ${destinatario_id}`
    );

    const salaDestinatario = `user_${destinatario_id}`;
    io.to(salaDestinatario).emit("llamada_entrante", {
      remitente_id: remitente_id,
      remitente_nombre: remitente_nombre,
      llamada_id: `${remitente_id}_${Date.now()}`,
    });
  });

  socket.on("oferta_webrtc", (data) => {
    const { destinatario_id, oferta, llamada_id } = data;
    console.log(`📡 Reenviando oferta WebRTC a ${destinatario_id}`);

    const salaDestinatario = `user_${destinatario_id}`;
    io.to(salaDestinatario).emit("oferta_webrtc", {
      oferta: oferta,
      remitente_id: socket.usuario_id,
      llamada_id: llamada_id,
    });
  });

  socket.on("respuesta_webrtc", (data) => {
    const { destinatario_id, respuesta, llamada_id } = data;
    console.log(`📡 Reenviando respuesta WebRTC a ${destinatario_id}`);

    const salaDestinatario = `user_${destinatario_id}`;
    io.to(salaDestinatario).emit("respuesta_webrtc", {
      respuesta: respuesta,
      remitente_id: socket.usuario_id,
      llamada_id: llamada_id,
    });
  });

  socket.on("candidato_ice", (data) => {
    const { destinatario_id, candidato, llamada_id } = data;
    console.log(`🧊 Reenviando candidato ICE a ${destinatario_id}`);

    const salaDestinatario = `user_${destinatario_id}`;
    io.to(salaDestinatario).emit("candidato_ice", {
      candidato: candidato,
      remitente_id: socket.usuario_id,
      llamada_id: llamada_id,
    });
  });

  socket.on("aceptar_videollamada", (data) => {
    const { llamada_id, remitente_id } = data;
    console.log(`✅ Videollamada aceptada, notificando a ${remitente_id}`);

    const salaRemitente = `user_${remitente_id}`;
    io.to(salaRemitente).emit("llamada_aceptada", {
      llamada_id: llamada_id,
      destinatario_id: socket.usuario_id,
    });
  });

  socket.on("rechazar_videollamada", (data) => {
    const { llamada_id, remitente_id } = data;
    console.log(`❌ Videollamada rechazada, notificando a ${remitente_id}`);

    const salaRemitente = `user_${remitente_id}`;
    io.to(salaRemitente).emit("llamada_rechazada", {
      llamada_id: llamada_id,
      destinatario_id: socket.usuario_id,
    });
  });

  socket.on("finalizar_videollamada", (data) => {
    const { llamada_id, destinatario_id } = data;
    console.log(`📞 Videollamada finalizada, notificando a ${destinatario_id}`);

    const salaDestinatario = `user_${destinatario_id}`;
    io.to(salaDestinatario).emit("videollamada_finalizada", {
      llamada_id: llamada_id,
      remitente_id: socket.usuario_id,
    });
  });

  socket.on("solicitar_estados", () => {
    actualizarEstadosGlobales();
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);

    if (socket.usuario_id) {
      usuariosConectados.delete(socket.usuario_id);
      usuariosEscribiendo.delete(socket.usuario_id);
      usuariosEscribiendoGrupo.delete(socket.usuario_id);

      actualizarEstadosGlobales();
      console.log(
        `❌ Usuario ${socket.usuario_id} desconectado. Conectados:`,
        Array.from(usuariosConectados.keys())
      );
    }
  });

  // Agregar después de los otros eventos del socket

  socket.on("crear_lista_tareas", (data) => {
    const { grupo_id, remitente_id, tareas } = data;

    console.log(`📋 Creando lista de tareas para grupo ${grupo_id}`, {
      remitente_id,
      cantidad_tareas: tareas.length,
    });

    // 1. Obtener nombre del remitente
    const nombreQuery = "SELECT nombre FROM usuario WHERE id = ?";
    db.execute(nombreQuery, [remitente_id], (err, results) => {
      if (err) {
        console.error("Error obteniendo nombre del remitente:", err);
        return;
      }

      const remitente_nombre =
        results.length > 0 ? results[0].nombre : "Usuario";

      // 2. Crear mensaje principal
      const mensajePrincipal = `${remitente_nombre} ha creado una lista de tareas`;

      const queryMensaje = `
            INSERT INTO mensajes_grupo 
            (grupo_id, remitente_id, mensaje, tipo_mensaje) 
            VALUES (?, ?, ?, 'lista_tareas')
        `;

      db.execute(
        queryMensaje,
        [grupo_id, remitente_id, mensajePrincipal],
        (err, results) => {
          if (err) {
            console.error("Error guardando mensaje de lista:", err);
            return;
          }

          const mensajeId = results.insertId;
          console.log(`✅ Mensaje de lista creado, ID: ${mensajeId}`);

          // 3. Guardar cada tarea
          const queryTarea = `
                INSERT INTO lista_tareas (mensaje_grupo_id, tarea_texto) 
                VALUES (?, ?)
            `;

          let tareasGuardadas = 0;
          const tareasIds = [];

          tareas.forEach((tareaTexto, index) => {
            db.execute(queryTarea, [mensajeId, tareaTexto], (err, results) => {
              if (err) {
                console.error("Error guardando tarea:", err);
                return;
              }

              tareasGuardadas++;
              tareasIds.push(results.insertId);

              // Cuando todas las tareas estén guardadas
              if (tareasGuardadas === tareas.length) {
                console.log(`✅ Todas las ${tareas.length} tareas guardadas`);

                // 4. Enviar mensaje completo al grupo
                const mensajeCompleto = {
                  id: mensajeId,
                  grupo_id,
                  remitente_id,
                  remitente_nombre,
                  mensaje: mensajePrincipal,
                  tipo_mensaje: "lista_tareas",
                  tareas: tareas.map((texto, idx) => ({
                    id: tareasIds[idx],
                    texto: texto,
                    completada: false,
                  })),
                  fecha_envio: new Date().toISOString(),
                };

                const salaGrupo = `grupo_${grupo_id}`;
                io.to(salaGrupo).emit("nueva_lista_tareas", mensajeCompleto);

                // Actualizar lista de chats
                io.to(salaGrupo).emit("actualizar_lista_chats", {
                  es_grupo: true,
                  grupo_id: grupo_id,
                  ultimo_mensaje: mensajePrincipal,
                  es_mio: false,
                  fecha_envio: new Date().toISOString(),
                });

                console.log(`✅ Lista de tareas enviada al grupo ${grupo_id}`);
              }
            });
          });
        }
      );
    });
  });

  socket.on("completar_tarea", (data) => {
    const { tarea_id, usuario_id, grupo_id } = data;

    console.log(`✅ Usuario ${usuario_id} completando tarea ${tarea_id}`);

    // Verificar si ya completó esta tarea
    const verificarQuery =
      "SELECT 1 FROM tareas_completadas WHERE tarea_id = ? AND usuario_id = ?";
    db.execute(verificarQuery, [tarea_id, usuario_id], (err, results) => {
      if (err) {
        console.error("Error verificando tarea:", err);
        return;
      }

      if (results.length > 0) {
        console.log(`⚠️ Usuario ${usuario_id} ya completó esta tarea`);
        return;
      }

      // Registrar completado
      const completarQuery = `
            INSERT INTO tareas_completadas (tarea_id, usuario_id) 
            VALUES (?, ?)
        `;

      db.execute(completarQuery, [tarea_id, usuario_id], (err, results) => {
        if (err) {
          console.error("Error registrando tarea completada:", err);
          return;
        }

        // Actualizar estado de la tarea
        const actualizarTareaQuery =
          "UPDATE lista_tareas SET completada = TRUE WHERE id = ?";
        db.execute(actualizarTareaQuery, [tarea_id], (err, results) => {
          if (err) {
            console.error("Error actualizando tarea:", err);
            return;
          }

          // Otorgar puntos al usuario
          const puntosQuery = `
                    UPDATE usuario_nivel 
                    SET puntos = puntos + 1 
                    WHERE usuario_id = ?
                `;

          db.execute(puntosQuery, [usuario_id], (err, results) => {
            if (err) {
              console.error("Error otorgando puntos:", err);
            } else {
              console.log(
                `🎉 Usuario ${usuario_id} recibió 1 punto por completar tarea`
              );
            }

            // Notificar al grupo
            const salaGrupo = `grupo_${grupo_id}`;
            io.to(salaGrupo).emit("tarea_completada", {
              tarea_id: tarea_id,
              usuario_id: usuario_id,
              grupo_id: grupo_id,
            });

            console.log(
              `✅ Tarea ${tarea_id} marcada como completada por usuario ${usuario_id}`
            );
          });
        });
      });
    });
  });

  // Agregar también el evento para recibir listas de tareas
  socket.on("nueva_lista_tareas", (data) => {
    console.log("📋 Nueva lista de tareas recibida:", data);
    // El manejo del frontend se hará en inicio.js
  });

  socket.on("tarea_completada", (data) => {
    console.log("✅ Tarea completada recibida:", data);
    // Actualizar la interfaz cuando alguien complete una tarea
  });
});

function actualizarEstadosGlobales() {
  const estados = {
    conectados: Array.from(usuariosConectados.keys()),
    escribiendo: Array.from(usuariosEscribiendo.entries()).map(
      ([usuarioId, destinatarioId]) => ({
        usuario_id: usuarioId,
        destinatario_id: destinatarioId,
      })
    ),
  };

  console.log("🔄 Actualizando estados globales:", estados);
  io.emit("estados_globales_actualizados", estados);
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor de chat ejecutándose en puerto ${PORT}`);
});
