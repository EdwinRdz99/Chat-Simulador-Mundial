
let archivoTemporal = null;
let usuarioActualId;
let chatActivoId;
let grupoActivoId = null;
let timeoutEscribiendo;
let estaEscribiendo = false;
let usuariosConectadosGlobal = new Set();
let usuariosEscribiendoGlobal = new Map();


let localStream = null;
let remoteStream = null;
let peerConnection = null;
let currentCallId = null;
let isInCall = false;


let audioContext;
let callIncomingSound;
let callOutgoingSound;
let callConnectSound;
let callRejectSound;
let callEndSound;
let messageNotificationSound;


let ubicacionSeleccionada = null;

let encriptacionActivada = false;
let claveEncriptacion = null;


const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

function inicializarAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    cargarSonidos();
    console.log("🔊 Sistema de audio inicializado");
  } catch (error) {
    console.warn("❌ No se pudo inicializar el audio:", error);
  }
}

function cargarSonidos() {
  callIncomingSound = new Audio("../sounds/call-incoming.mp3");
  callOutgoingSound = new Audio("../sounds/call-outgoing.mp3");
  callConnectSound = new Audio("../sounds/call-connect.mp3");
  callRejectSound = new Audio("../sounds/call-reject.mp3");
  callEndSound = new Audio("../sounds/call-end.mp3");
  messageNotificationSound = new Audio("../sounds/message-notification.mp3");

  const sonidos = [
    callIncomingSound,
    callOutgoingSound,
    callConnectSound,
    callRejectSound,
    callEndSound,
    messageNotificationSound,
  ];

  sonidos.forEach((sound) => {
    sound.preload = "auto";
    sound.volume = 0.7;
  });

  console.log("🎵 Sonidos cargados correctamente");
}

function reproducirSonido(sound, loop = false) {
  if (!sound) return;

  try {
    sound.currentTime = 0;
    sound.loop = loop;
    sound.play().catch((error) => {
      console.warn("No se pudo reproducir sonido:", error);
    });
  } catch (error) {
    console.warn("Error reproduciendo sonido:", error);
  }
}

function detenerSonido(sound) {
  if (!sound) return;

  try {
    sound.pause();
    sound.currentTime = 0;
  } catch (error) {
    console.warn("Error deteniendo sonido:", error);
  }
}

function inicializarEncriptacion() {
  
  const estadoGuardado = localStorage.getItem("encriptacionActivada");
  if (estadoGuardado !== null) {
    encriptacionActivada = JSON.parse(estadoGuardado);
  }

  claveEncriptacion = "Karina:D";

  const encryptSwitch = document.getElementById("encryptSwitch");
  if (encryptSwitch) {
    encryptSwitch.checked = encriptacionActivada;
    actualizarEstiloEncriptacion();
  }

  console.log("🔐 Sistema de encriptación inicializado con clave fija:", {
    activada: encriptacionActivada,
    clave: claveEncriptacion,
  });
}

function generarClavePorDefecto() {
  return CryptoJS.lib.WordArray.random(32).toString();
}

function toggleEncriptacion() {
  encriptacionActivada = !encriptacionActivada;

  localStorage.setItem(
    "encriptacionActivada",
    JSON.stringify(encriptacionActivada)
  );

  actualizarEstiloEncriptacion();

  const estado = encriptacionActivada ? "activada" : "desactivada";
  mostrarNotificacionEncriptacion(`Encriptación ${estado}`);
}

function actualizarEstiloEncriptacion() {
  const encryptSwitch = document.getElementById("encryptSwitch");
  const label = encryptSwitch ? encryptSwitch.nextElementSibling : null;

  if (encriptacionActivada) {
    if (label) {
      label.innerHTML = '<i class="fas fa-lock" style="color: #28a745;"></i>';
    }
  } else {
    if (label) {
      label.innerHTML =
        '<i class="fas fa-lock-open" style="color: #6c757d;"></i>';
    }
    document.querySelector(".message-input-container").style.border = "";
  }
}

function mostrarNotificacionEncriptacion(mensaje) {
  const notificacion = document.createElement("div");
  notificacion.className = "alert alert-info alert-dismissible fade show";
  notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
    `;
  notificacion.innerHTML = `
        <strong>🔐 ${mensaje}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  document.body.appendChild(notificacion);

  setTimeout(() => {
    if (notificacion.parentNode) {
      notificacion.remove();
    }
  }, 3000);
}

function encriptarMensaje(texto) {
  if (!encriptacionActivada || !claveEncriptacion) {
    return texto;
  }

  try {
    const textoEncriptado = CryptoJS.AES.encrypt(
      texto,
      claveEncriptacion
    ).toString();
    console.log("🔒 Mensaje encriptado correctamente");
    return textoEncriptado;
  } catch (error) {
    console.error("❌ Error encriptando mensaje:", error);
    return texto; 
  }
}

function desencriptarMensaje(textoEncriptado) {
  if (!claveEncriptacion || !textoEncriptado) {
    return textoEncriptado; 
  }

  try {
    
    if (textoEncriptado && textoEncriptado.startsWith("U2FsdGVkX1")) {
      const bytes = CryptoJS.AES.decrypt(textoEncriptado, claveEncriptacion);
      const textoOriginal = bytes.toString(CryptoJS.enc.Utf8);

      
      if (textoOriginal && textoOriginal.length > 0) {
        console.log("🔓 Mensaje desencriptado correctamente");
        return textoOriginal;
      } else {
        console.warn(
          "⚠️ No se pudo desencriptar (posible clave incorrecta o texto no encriptado)"
        );
        return textoEncriptado; 
      }
    }

    return textoEncriptado;
  } catch (error) {
    console.error("❌ Error desencriptando mensaje:", error);
    return textoEncriptado; 
  }
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Iniciando aplicación de chat...");

  console.log("✅ DOM cargado: configurando eventos del modal de grupos...");

  const createGroupBtn = document.getElementById("createGroupBtn");
  const confirmCreateGroup = document.getElementById("confirmCreateGroup");

  if (createGroupBtn) {
    createGroupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      mostrarModalCrearGrupo();
    });
    console.log("🟢 Botón 'Crear Grupo' configurado correctamente");
  } else {
    console.warn("⚠️ No se encontró el botón 'createGroupBtn'");
  }

  if (confirmCreateGroup) {
    confirmCreateGroup.addEventListener("click", crearGrupo);
    console.log("🟢 Botón 'Confirmar Crear Grupo' configurado correctamente");
  }

  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("group-member-checkbox")) {
      actualizarContadorMiembros();
    }
  });

  inicializarEncriptacion();
  inicializarAudio();

  usuarioActualId = document.body.getAttribute("data-usuario-id");
  chatActivoId = document.body.getAttribute("data-chat-activo") || null;

  socket.emit("registrar_usuario", usuarioActualId);

  socket.emit("solicitar_estados");

  console.log("Estado del socket:", socket.connected);
  console.log("Usuario actual ID:", usuarioActualId);
  console.log("Chat activo ID:", chatActivoId);

  if (chatActivoId && chatActivoId !== "null") {
    const esGrupo = document.body.getAttribute("data-es-grupo") === "true";
    console.log("Chat activo encontrado:", { chatActivoId, esGrupo });

    if (esGrupo) {
      unirseAlGrupo(chatActivoId);
    } else {
      unirseAlChat(chatActivoId);
    }

    cargarHistorialMensajes(chatActivoId, esGrupo);

    if (!esGrupo) {
      setTimeout(verificarEstadoEscrituraInicial, 1000);
    }
  } else {
    console.log("No hay chat activo");
  }

  configurarEventListeners();



  socket.on("llamada_entrante", (data) => {
    console.log("📞 Llamada entrante:", data);

    reproducirSonido(callIncomingSound, true);

    mostrarModalLlamadaEntrante(data.remitente_nombre, (aceptada) => {
      if (aceptada) {
        detenerSonido(callIncomingSound);
        aceptarVideollamada(data.llamada_id, data.remitente_id);
      } else {
        detenerSonido(callIncomingSound);
        reproducirSonido(callRejectSound);
        rechazarVideollamada(data.llamada_id, data.remitente_id);
      }
    });
  });

  socket.on("llamada_aceptada", (data) => {
    console.log("✅ Llamada aceptada por el destinatario");
    detenerSonido(callOutgoingSound);
    reproducirSonido(callConnectSound);
    inicializarWebRTC(false);
  });

  socket.on("llamada_rechazada", (data) => {
    console.log("❌ Llamada rechazada");
    detenerSonido(callOutgoingSound);
    reproducirSonido(callRejectSound);
    alert("El usuario rechazó la videollamada");
    finalizarVideollamada();
  });

  socket.on("oferta_webrtc", async (data) => {
    console.log("📡 Oferta WebRTC recibida", data);

    if (!peerConnection) {
      await inicializarWebRTC(true);
    }

    try {
      if (data.oferta) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.oferta)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        console.log("📤 Enviando respuesta WebRTC");
        socket.emit("respuesta_webrtc", {
          destinatario_id: parseInt(data.remitente_id),
          respuesta: answer,
          llamada_id: data.llamada_id,
        });
      }
    } catch (error) {
      console.error("❌ Error manejando oferta WebRTC:", error);
      finalizarVideollamada();
    }
  });

  socket.on("respuesta_webrtc", async (data) => {
    console.log("📡 Respuesta WebRTC recibida", data);

    if (peerConnection && data.respuesta) {
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.respuesta)
        );
        console.log("✅ Respuesta WebRTC configurada correctamente");
      } catch (error) {
        console.error("❌ Error manejando respuesta WebRTC:", error);
      }
    }
  });

  socket.on("candidato_ice", async (data) => {
    console.log("🧊 Candidato ICE recibido", data);

    if (peerConnection && data.candidato) {
      try {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(data.candidato)
        );
      } catch (error) {
        console.error("❌ Error agregando candidato ICE:", error);
      }
    }
  });

  socket.on("videollamada_finalizada", (data) => {
    console.log("📞 Videollamada finalizada por el otro usuario");
    reproducirSonido(callEndSound);
    finalizarVideollamada();
    alert("El otro usuario finalizó la videollamada");
  });

  socket.on("nuevo_mensaje", (mensaje) => {
    console.log("📨 Mensaje recibido del servidor:", mensaje);

    if (
      chatActivoId &&
      ((mensaje.remitente_id === parseInt(usuarioActualId) &&
        mensaje.destinatario_id === parseInt(chatActivoId)) ||
        (mensaje.remitente_id === parseInt(chatActivoId) &&
          mensaje.destinatario_id === parseInt(usuarioActualId)))
    ) {
      console.log("✅ Mensaje para chat actual, mostrando...");
      agregarMensajeALaVista(mensaje);

      if (mensaje.remitente_id === parseInt(chatActivoId)) {
        reproducirSonido(messageNotificationSound);
        ocultarIndicadorEscribiendo();
      }
    } else {
      console.log("❌ Mensaje no es para el chat actual");
    }
  });

  socket.on("nuevo_mensaje_grupo", (mensaje) => {
    console.log("📨 Mensaje de grupo recibido del servidor:", mensaje);

    if (chatActivoId && mensaje.grupo_id === parseInt(chatActivoId)) {
      console.log("✅ Mensaje para grupo actual, mostrando...");
      agregarMensajeGrupoALaVista(mensaje);

      reproducirSonido(messageNotificationSound);
    } else {
      console.log("❌ Mensaje no es para el grupo actual");
    }
  });

  socket.on("actualizar_lista_chats", (data) => {
    console.log("🔄 Actualizando lista de chats:", data);
    actualizarItemListaChats(data);
  });

  socket.on("estados_globales_actualizados", (estados) => {
    console.log("🌍 Estados globales actualizados:", estados);
    actualizarEstadosGlobales(estados);
  });

  socket.on("lista_usuarios_conectados", (usuariosConectados) => {
    console.log("👥 Usuarios conectados recibidos:", usuariosConectados);
    usuariosConectadosGlobal = new Set(usuariosConectados);
    actualizarInterfazEstados();
  });

  socket.on("estado_escribiendo", (data) => {
    console.log("✍️ Estado escribiendo específico:", data);

    const { usuario_id, destinatario_id, escribiendo } = data;

    if (escribiendo) {
      usuariosEscribiendoGlobal.set(usuario_id, destinatario_id);
    } else {
      usuariosEscribiendoGlobal.delete(usuario_id);
    }

    actualizarInterfazEstados();

    if (
      parseInt(chatActivoId) === usuario_id &&
      parseInt(usuarioActualId) === destinatario_id
    ) {
      if (escribiendo) {
        mostrarIndicadorEscribiendo();
      } else {
        ocultarIndicadorEscribiendo();
      }
    }
  });

  socket.on("error_mensaje", (error) => {
    console.error("❌ Error del servidor:", error);
    alert("Error al enviar mensaje: " + error.error);
  });

  socket.on("estado_escribiendo_grupo", (data) => {
    console.log("✍️ Estado escribiendo en grupo:", data);

    const { usuario_id, grupo_id, escribiendo, usuario_nombre } = data;

    if (
      chatActivoId &&
      parseInt(chatActivoId) === grupo_id &&
      parseInt(usuario_id) !== parseInt(usuarioActualId)
    ) {
      if (escribiendo) {
        console.log(
          "✅ Mostrando indicador escribiendo en grupo para:",
          usuario_nombre
        );
        mostrarIndicadorEscribiendoGrupo(usuario_nombre);
      } else {
        console.log("❌ Ocultando indicador escribiendo en grupo");
        ocultarIndicadorEscribiendo();
      }
    }
  });



  socket.on("nueva_lista_tareas", (data) => {
    console.log("📋 Nueva lista de tareas recibida:", data);

    if (chatActivoId && data.grupo_id === parseInt(chatActivoId)) {
      console.log("✅ Lista de tareas para grupo actual, mostrando...");
      agregarListaTareasALaVista(data);
      reproducirSonido(messageNotificationSound);
    }
  });

  socket.on("tarea_completada", (data) => {
    console.log("✅ Tarea completada por otro usuario:", data);

    if (chatActivoId && data.grupo_id === parseInt(chatActivoId)) {
     
      const checkbox = document.querySelector(
        `.task-checkbox[data-tarea-id="${data.tarea_id}"]`
      );
      if (checkbox) {
        checkbox.checked = true;
        checkbox.disabled = true;
        checkbox.closest(".task-item").classList.add("task-completed");
      }
    }
  });

  function agregarListaTareasALaVista(data) {
    const container = document.getElementById("messagesContainer");
    if (!container) return;

    const estabaAlFinal = isScrolledToBottom(container);
    const mensajeElement = crearElementoListaTareas(data);
    container.appendChild(mensajeElement);

    if (estabaAlFinal) {
      scrollToBottom();
    }
  }

  function crearElementoListaTareas(data) {
    const esMio = parseInt(data.remitente_id) === parseInt(usuarioActualId);
    const clase = esMio ? "sent" : "received";
    const hora = new Date(data.fecha_envio).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const div = document.createElement("div");
    div.className = `message ${clase}`;

    let nombreRemitente = "";
    if (!esMio) {
      nombreRemitente = `<div class="message-sender">${escapeHtml(
        data.remitente_nombre
      )}</div>`;
    }

    let tareasHTML = "";
    if (data.tareas && data.tareas.length > 0) {
      data.tareas.forEach((tarea) => {
        tareasHTML += `
                <div class="task-item">
                    <div class="form-check">
                        <input class="form-check-input task-checkbox" type="checkbox" 
                               data-tarea-id="${tarea.id}" 
                               onchange="completarTarea(${tarea.id}, this)">
                        <label class="form-check-label">${escapeHtml(
                          tarea.texto
                        )}</label>
                    </div>
                </div>
            `;
      });
    }

    div.innerHTML = `
        ${nombreRemitente}
        <div class="message-tasks">
            <div class="tasks-header">
                <i class="fas fa-tasks me-2"></i>
                <strong>${escapeHtml(data.mensaje)}</strong>
            </div>
            <div class="tasks-list">
                ${tareasHTML}
            </div>
            <div class="message-time">${hora}</div>
        </div>
    `;

    return div;
  }

  function mostrarIndicadorEscribiendoGrupo(nombreUsuario) {
    const container = document.getElementById("messagesContainer");
    if (container) {
      const burbujaAnterior = document.getElementById(
        "burbuja-escribiendo-grupo"
      );
      if (burbujaAnterior) {
        burbujaAnterior.remove();
      }

      const burbuja = document.createElement("div");
      burbuja.id = "burbuja-escribiendo-grupo";
      burbuja.className = "escribiendo-burbuja";
      burbuja.innerHTML = `
            <div class="escribiendo-animacion">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="escribiendo-texto">${escapeHtml(
              nombreUsuario
            )} está escribiendo...</span>
        `;
      container.appendChild(burbuja);
      scrollToBottom();
    }
  }
});



function iniciarVideollamada() {
  if (!chatActivoId) {
    alert("Selecciona un usuario para iniciar videollamada");
    return;
  }

  console.log("📞 Iniciando videollamada...");
  currentCallId = `${usuarioActualId}_${Date.now()}`;

  const usuarioActualNombre =
    document
      .querySelector(".user-actions span")
      ?.textContent.replace("Hola, ", "") || "Usuario";

  reproducirSonido(callOutgoingSound, true);

  mostrarModalLlamando();

  socket.emit("iniciar_videollamada", {
    remitente_id: parseInt(usuarioActualId),
    destinatario_id: parseInt(chatActivoId),
    remitente_nombre: usuarioActualNombre,
    llamada_id: currentCallId,
  });

  setTimeout(() => {
    if (!isInCall) {
      detenerSonido(callOutgoingSound);
      reproducirSonido(callRejectSound);
      finalizarVideollamada();
      alert("El usuario no respondió a la llamada");
    }
  }, 30000);
}

function aceptarVideollamada(llamadaId, remitenteId) {
  console.log("✅ Aceptando videollamada...");
  currentCallId = llamadaId;

  socket.emit("aceptar_videollamada", {
    llamada_id: llamadaId,
    destinatario_id: parseInt(usuarioActualId),
    remitente_id: parseInt(remitenteId),
  });

  inicializarWebRTC(true);
}

function rechazarVideollamada(llamadaId, remitenteId) {
  console.log("❌ Rechazando videollamada...");

  socket.emit("rechazar_videollamada", {
    llamada_id: llamadaId,
    remitente_id: parseInt(remitenteId),
  });

  ocultarModalLlamadaEntrante();
}

function mostrarModalLlamadaEntrante(remitenteNombre, callback) {
  const modalExistente = document.getElementById("incomingCallModal");
  if (modalExistente) {
    modalExistente.remove();
  }

  const modalHtml = `
    <div class="modal fade" id="incomingCallModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content incoming-call-modal">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">📞 Llamada entrante</h5>
          </div>
          <div class="modal-body text-center">
            <div class="call-icon mb-3">
              <i class="fas fa-phone-alt fa-3x text-primary"></i>
            </div>
            <p class="fs-5"><strong>${remitenteNombre}</strong> te está llamando</p>
            <p class="text-muted">¿Deseas aceptar la videollamada?</p>
          </div>
          <div class="modal-footer justify-content-center">
            <button type="button" class="btn btn-danger btn-lg me-3" id="rejectCallBtn">
              <i class="fas fa-times me-2"></i>Rechazar
            </button>
            <button type="button" class="btn btn-success btn-lg" id="acceptCallBtn">
              <i class="fas fa-phone me-2"></i>Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  const modalElement = document.getElementById("incomingCallModal");
  const modal = new bootstrap.Modal(modalElement);

  modalElement.addEventListener("shown.bs.modal", function () {
    document.getElementById("acceptCallBtn").onclick = () => {
      console.log("✅ Llamada aceptada");
      modal.hide();
      setTimeout(() => {
        modalElement.remove();
        callback(true);
      }, 300);
    };

    document.getElementById("rejectCallBtn").onclick = () => {
      console.log("❌ Llamada rechazada");
      modal.hide();
      setTimeout(() => {
        modalElement.remove();
        callback(false);
      }, 300);
    };
  });

  modal.show();

  modalElement.addEventListener("hidden.bs.modal", function () {
    modalElement.remove();
  });

  setTimeout(() => {
    if (document.getElementById("incomingCallModal")) {
      console.log("⏰ Timeout - Llamada auto-rechazada");
      modal.hide();
      modalElement.remove();
      callback(false);
    }
  }, 30000);
}

function ocultarModalLlamadaEntrante() {
  const modalElement = document.getElementById("incomingCallModal");
  if (modalElement) {
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    } else {
      modalElement.remove();
    }
  }
}

async function inicializarWebRTC(esReceptor = false) {
  try {
    console.log("🔧 Inicializando WebRTC...", { esReceptor });

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    const localVideo = document.getElementById("localVideo");
    if (localVideo) {
      localVideo.srcObject = localStream;
      localVideo.muted = true;
    }

    if (peerConnection) {
      peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      console.log("📹 Stream remoto recibido", event.streams);
      remoteStream = event.streams[0];
      const remoteVideo = document.getElementById("remoteVideo");
      if (remoteVideo && remoteStream) {
        remoteVideo.srcObject = remoteStream;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && chatActivoId) {
        console.log("🧊 Enviando candidato ICE");
        socket.emit("candidato_ice", {
          destinatario_id: parseInt(chatActivoId),
          candidato: event.candidate,
          llamada_id: currentCallId,
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log("🔌 Estado conexión:", peerConnection.connectionState);
      if (peerConnection.connectionState === "connected") {
        console.log("✅ Conexión WebRTC establecida");
      }
    };

    if (!esReceptor) {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        console.log("📤 Enviando oferta WebRTC");
        socket.emit("oferta_webrtc", {
          destinatario_id: parseInt(chatActivoId),
          oferta: offer,
          llamada_id: currentCallId,
        });
      } catch (error) {
        console.error("❌ Error creando oferta:", error);
      }
    }

    isInCall = true;
    mostrarModalVideollamada();
  } catch (error) {
    console.error("❌ Error inicializando WebRTC:", error);

    if (error.name === "NotAllowedError") {
      alert("Se necesitan permisos de cámara y micrófono para la videollamada");
    } else if (error.name === "NotFoundError") {
      alert("No se encontró cámara o micrófono disponible");
    } else {
      alert("Error al acceder a la cámara/micrófono: " + error.message);
    }

    finalizarVideollamada();
  }
}

function finalizarVideollamada() {
  console.log("📞 Finalizando videollamada...");

  detenerSonido(callIncomingSound);
  detenerSonido(callOutgoingSound);

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
    remoteStream = null;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (currentCallId && chatActivoId) {
    socket.emit("finalizar_videollamada", {
      destinatario_id: parseInt(chatActivoId),
      llamada_id: currentCallId,
    });
  }

  isInCall = false;
  currentCallId = null;

  ocultarModalVideollamada();
  ocultarModalLlamadaEntrante();
}

function mostrarModalLlamando() {
  console.log("📞 Mostrando estado de llamando...");
}

function mostrarModalVideollamada() {
  const modal = new bootstrap.Modal(document.getElementById("videoCallModal"));
  modal.show();
}

function ocultarModalVideollamada() {
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("videoCallModal")
  );
  if (modal) {
    modal.hide();
  }
}



function actualizarEstadosGlobales(estados) {
  usuariosConectadosGlobal = new Set(estados.conectados);

  usuariosEscribiendoGlobal.clear();
  estados.escribiendo.forEach(({ usuario_id, destinatario_id }) => {
    usuariosEscribiendoGlobal.set(usuario_id, destinatario_id);
  });

  actualizarInterfazEstados();
}

function actualizarInterfazEstados() {
  console.log("🎨 Actualizando interfaz con estados...");

  document.querySelectorAll(".chat-item").forEach((chatItem) => {
    const userId = parseInt(chatItem.getAttribute("data-userid"));
    actualizarEstadoChatItem(chatItem, userId);
  });

  actualizarEstadoHeaderChatActivo();
}

function actualizarEstadoHeaderChatActivo() {
  if (!chatActivoId) return;

  const headerAvatar = document.querySelector(
    ".chat-header .avatar .status-indicator"
  );
  const statusElement = document.querySelector(".current-chat-status");

  if (!headerAvatar || !statusElement) return;

  const userId = parseInt(chatActivoId);
  const estaConectado = usuariosConectadosGlobal.has(userId);
  const estaEscribiendoAmi =
    usuariosEscribiendoGlobal.get(userId) === parseInt(usuarioActualId);

  console.log(`🔄 Actualizando header chat ${userId}:`, {
    conectado: estaConectado,
    escribiendo: estaEscribiendoAmi,
  });

  if (estaConectado) {
    headerAvatar.className = "status-indicator online";
    headerAvatar.style.display = "block";
  } else {
    headerAvatar.className = "status-indicator offline";
    headerAvatar.style.display = "none";
  }

  if (estaEscribiendoAmi) {
    statusElement.innerHTML =
      '<span style="color: #4CAF50;">✍️ Escribiendo...</span>';
  } else if (estaConectado) {
    statusElement.textContent = "En línea";
    statusElement.style.color = "#4CAF50";
  } else {
    statusElement.textContent = "Desconectado";
    statusElement.style.color = "#666";
  }
}

function actualizarEstadoChatItem(chatItem, userId) {
  const statusIndicator = chatItem.querySelector(".status-indicator");
  const lastMessageElement = chatItem.querySelector(".last-message");

  if (!statusIndicator || !lastMessageElement) return;

  const estaConectado = usuariosConectadosGlobal.has(userId);
  const estaEscribiendoAmi =
    usuariosEscribiendoGlobal.get(userId) === parseInt(usuarioActualId);

  console.log(`🔄 Actualizando chat item ${userId}:`, {
    conectado: estaConectado,
    escribiendo: estaEscribiendoAmi,
  });

  if (estaConectado) {
    statusIndicator.className = "status-indicator online";
    statusIndicator.style.display = "block";
  } else {
    statusIndicator.className = "status-indicator offline";
    statusIndicator.style.display = "none";
  }

  const mensajeOriginal =
    lastMessageElement.getAttribute("data-mensaje-original") ||
    lastMessageElement.textContent;


  let mensajeDesencriptado = desencriptarMensaje(mensajeOriginal);

  if (estaEscribiendoAmi) {
    lastMessageElement.innerHTML =
      '<span style="color: #4CAF50; font-style: italic;">✍️ Escribiendo...</span>';
  } else {
    lastMessageElement.textContent = mensajeDesencriptado;
    lastMessageElement.removeAttribute("style");
  }
}

function unirseAlChat(destinatarioId) {
  socket.emit("unirse_chat", {
    usuario_id: parseInt(usuarioActualId),
    destinatario_id: parseInt(destinatarioId),
  });
  console.log(`🔗 Unido al chat con usuario: ${destinatarioId}`);
}

function unirseAlGrupo(grupoId) {
  socket.emit("unirse_grupo", {
    grupo_id: parseInt(grupoId),
    usuario_id: parseInt(usuarioActualId),
  });
  console.log(`🔗 Unido al grupo: ${grupoId}`);
}

function cargarHistorialMensajes(destinatarioId, esGrupo = false) {
  console.log("📂 Cargando historial de mensajes...", {
    destinatarioId,
    esGrupo,
  });

  const url = esGrupo
    ? `cargar_mensajes_grupo.php?grupo_id=${destinatarioId}`
    : `cargar_mensajes.php?destinatario_id=${destinatarioId}`;

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      return response.text();
    })
    .then((data) => {
      const container = document.getElementById("messagesContainer");
      if (!container) return;

      try {
      
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = data;
     
        tempDiv.querySelectorAll(".message-text").forEach((el) => {
          const texto = el.textContent.trim();
          const textoDesencriptado = desencriptarMensaje(texto);
          el.textContent = textoDesencriptado;
        });

        container.innerHTML = tempDiv.innerHTML;
        scrollToBottom();
        console.log("✅ Historial cargado y desencriptado correctamente");
      } catch (error) {
        console.error("❌ Error desencriptando historial:", error);
        container.innerHTML = data;
      }
    })
    .catch((error) => {
      console.error("❌ Error cargando historial:", error);
      const container = document.getElementById("messagesContainer");
      if (container) {
        container.innerHTML =
          '<div style="padding: 1rem; text-align: center; color: #666;">Error al cargar mensajes</div>';
      }
    });
}

function enviarMensaje() {
  const messageInput = document.getElementById("messageInput");
  const mensaje = messageInput.value.trim();
  const esGrupo = messageInput.getAttribute("data-esgrupo") === "true";

  if (!mensaje || !chatActivoId) {
    console.log("❌ Mensaje vacío o sin chat activo");
    return;
  }

  console.log("📤 Enviando mensaje:", { mensaje, esGrupo });

  const mensajeAEnviar = encriptacionActivada
    ? encriptarMensaje(mensaje)
    : mensaje;

  if (esGrupo) {
    socket.emit("enviar_mensaje_grupo", {
      grupo_id: parseInt(chatActivoId),
      remitente_id: parseInt(usuarioActualId),
      mensaje: mensajeAEnviar,
      tipo_mensaje: "texto", 
    });
  } else {
    socket.emit("enviar_mensaje", {
      remitente_id: parseInt(usuarioActualId),
      destinatario_id: parseInt(chatActivoId),
      mensaje: mensajeAEnviar,
      tipo_mensaje: "texto", 
    });
  }

  limpiarEstadoEscritura();

  messageInput.value = "";
  console.log("✅ Mensaje enviado");
}

function manejarEscritura() {
  if (!chatActivoId) return;

  const messageInput = document.getElementById("messageInput");
  const esGrupo = messageInput.getAttribute("data-esgrupo") === "true";
  const tieneTexto = messageInput.value.trim().length > 0;
  /*
  console.log("✍️ Manejar escritura:", {
    tieneTexto,
    estaEscribiendo,
    esGrupo,
  });
  */

  if (timeoutEscribiendo) {
    clearTimeout(timeoutEscribiendo);
    timeoutEscribiendo = null;
  }

  if (tieneTexto && !estaEscribiendo) {
    estaEscribiendo = true;
    if (esGrupo) {
      socket.emit("usuario_escribiendo_grupo", {
        usuario_id: parseInt(usuarioActualId),
        grupo_id: parseInt(chatActivoId),
        escribiendo: true,
      });
      console.log("✍️ [GRUPO] Empezó a escribir en grupo");
    } else {
      socket.emit("usuario_escribiendo", {
        usuario_id: parseInt(usuarioActualId),
        destinatario_id: parseInt(chatActivoId),
        escribiendo: true,
      });
      console.log("✍️ [INDIVIDUAL] Empezó a escribir");
    }
  } else if (!tieneTexto && estaEscribiendo) {
    estaEscribiendo = false;
    if (esGrupo) {
      socket.emit("usuario_escribiendo_grupo", {
        usuario_id: parseInt(usuarioActualId),
        grupo_id: parseInt(chatActivoId),
        escribiendo: false,
      });
      console.log("✍️ [GRUPO] Dejó de escribir en grupo (sin texto)");
    } else {
      socket.emit("usuario_escribiendo", {
        usuario_id: parseInt(usuarioActualId),
        destinatario_id: parseInt(chatActivoId),
        escribiendo: false,
      });
      console.log("✍️ [INDIVIDUAL] Dejó de escribir (sin texto)");
    }
  }

  if (tieneTexto && estaEscribiendo) {
    timeoutEscribiendo = setTimeout(() => {
      console.log("⏰ Timeout - Limpiando estado escribiendo");
      estaEscribiendo = false;
      if (esGrupo) {
        socket.emit("usuario_escribiendo_grupo", {
          usuario_id: parseInt(usuarioActualId),
          grupo_id: parseInt(chatActivoId),
          escribiendo: false,
        });
      } else {
        socket.emit("usuario_escribiendo", {
          usuario_id: parseInt(usuarioActualId),
          destinatario_id: parseInt(chatActivoId),
          escribiendo: false,
        });
      }
      timeoutEscribiendo = null;
    }, 5000);
  }
}

function verificarEstadoEscrituraInicial() {
  const messageInput = document.getElementById("messageInput");
  if (messageInput && chatActivoId) {
    const tieneTexto = messageInput.value.trim().length > 0;

    if (tieneTexto && !estaEscribiendo) {
      estaEscribiendo = true;
      socket.emit("usuario_escribiendo", {
        usuario_id: parseInt(usuarioActualId),
        destinatario_id: parseInt(chatActivoId),
        escribiendo: true,
      });
      console.log("✍️ Estado inicial: escribiendo (hay texto)");
    }
  }
}

function limpiarEstadoEscritura() {
  console.log("🧹 Limpiando estado de escritura");

  const messageInput = document.getElementById("messageInput");
  const esGrupo = messageInput
    ? messageInput.getAttribute("data-esgrupo") === "true"
    : false;

  if (timeoutEscribiendo) {
    clearTimeout(timeoutEscribiendo);
    timeoutEscribiendo = null;
  }

  if (estaEscribiendo) {
    estaEscribiendo = false;

    if (chatActivoId) {
      if (esGrupo) {
        socket.emit("usuario_escribiendo_grupo", {
          usuario_id: parseInt(usuarioActualId),
          grupo_id: parseInt(chatActivoId),
          escribiendo: false,
        });
        console.log("✍️ [GRUPO] Limpiado estado después de enviar");
      } else {
        socket.emit("usuario_escribiendo", {
          usuario_id: parseInt(usuarioActualId),
          destinatario_id: parseInt(chatActivoId),
          escribiendo: false,
        });
        console.log("✍️ [INDIVIDUAL] Limpiado estado después de enviar");
      }
    }
  }

  if (messageInput) {
    messageInput.value = "";
  }
}

function mostrarIndicadorEscribiendo() {
  const container = document.getElementById("messagesContainer");
  if (container) {
    const burbujaAnterior = document.getElementById("burbuja-escribiendo");
    if (burbujaAnterior) {
      burbujaAnterior.remove();
    }

    const burbuja = document.createElement("div");
    burbuja.id = "burbuja-escribiendo";
    burbuja.className = "escribiendo-burbuja";
    burbuja.innerHTML = `
      <div class="escribiendo-animacion">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="escribiendo-texto">Escribiendo...</span>
    `;
    container.appendChild(burbuja);
    scrollToBottom();
  }
}

function ocultarIndicadorEscribiendo() {
  const burbujaIndividual = document.getElementById("burbuja-escribiendo");
  const burbujaGrupo = document.getElementById("burbuja-escribiendo-grupo");

  if (burbujaIndividual) {
    burbujaIndividual.remove();
    console.log("🗑️ Indicador individual removido");
  }

  if (burbujaGrupo) {
    burbujaGrupo.remove();
    console.log("🗑️ Indicador grupo removido");
  }
}

function agregarMensajeALaVista(mensaje) {
  const container = document.getElementById("messagesContainer");
  if (!container) return;

  const estabaAlFinal = isScrolledToBottom(container);

  const mensajeProcesado = procesarMensajeRecibido(mensaje);

  const mensajeElement = crearElementoMensaje(mensajeProcesado);
  container.appendChild(mensajeElement);

  if (estabaAlFinal) {
    scrollToBottom();
  }
}

function actualizarItemListaChats(data) {
  const {
    usuario_id,
    ultimo_mensaje,
    es_mio,
    fecha_envio,
    es_grupo,
    grupo_id,
  } = data;

  if (!ultimo_mensaje) {
    return;
  }

  let mensajeDesencriptado = desencriptarMensaje(ultimo_mensaje);

  let mensajePrevisualizacion = es_mio
    ? "Tú: " + mensajeDesencriptado
    : mensajeDesencriptado;

  if (mensajePrevisualizacion.length > 35) {
    mensajePrevisualizacion = mensajePrevisualizacion.substring(0, 35) + "...";
  }


  const selector = es_grupo
    ? `.chat-item[data-groupid="${grupo_id}"]`
    : `.chat-item[data-userid="${usuario_id}"]`;

  const chatExistente = document.querySelector(selector);

  if (chatExistente) {
    const lastMessageElement = chatExistente.querySelector(".last-message");
    if (lastMessageElement) {

      const estaEscribiendoAmi =
        !es_grupo &&
        usuariosEscribiendoGlobal.get(parseInt(usuario_id)) ===
          parseInt(usuarioActualId);

      if (!estaEscribiendoAmi) {
        lastMessageElement.textContent = mensajePrevisualizacion;
        lastMessageElement.setAttribute(
          "data-mensaje-original",
          mensajePrevisualizacion
        );
      }
    }

    const chatsList = document.getElementById("usersList");
    if (chatsList && chatExistente.parentNode === chatsList) {
      chatsList.insertBefore(chatExistente, chatsList.firstChild);
    }

    console.log(
      `✅ ${es_grupo ? "Grupo" : "Chat"} ${
        es_grupo ? grupo_id : usuario_id
      } actualizado y movido al top`
    );
  } else {
    console.log(
      `${
        es_grupo ? "Grupo" : "Chat"
      } no encontrado, sería necesario recargar la lista completa`
    );
  }
}

function crearElementoMensaje(mensaje) {
  const esMio = parseInt(mensaje.remitente_id) === parseInt(usuarioActualId);
  const clase = esMio ? "sent" : "received";
  const hora = new Date(mensaje.fecha_envio).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const div = document.createElement("div");
  div.className = `message ${clase}`;

  let contenido = "";

  if (mensaje.tipo_mensaje === "ubicacion") {
    contenido = crearContenidoUbicacion(mensaje);
  } else if (mensaje.tipo_mensaje === "archivo") {
    contenido = crearContenidoArchivo(mensaje);
  } else {
    contenido = `
      <div class="message-text">${escapeHtml(mensaje.mensaje)}</div>
      <div class="message-time">${hora}</div>
    `;
  }

  div.innerHTML = contenido;
  return div;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function isScrolledToBottom(element) {
  return element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
}

function scrollToBottom() {
  const container = document.getElementById("messagesContainer");
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}



function obtenerUbicacion() {
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización");
    return;
  }

  if (!chatActivoId) {
    alert("Selecciona un chat para compartir ubicación");
    return;
  }

  const locationBtn = document.getElementById("locationBtn");
  const originalHtml = locationBtn.innerHTML;
  locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  locationBtn.disabled = true;

  console.log("📍 Solicitando ubicación...");

  const opcionesGeolocalizacion = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000,
  };

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      console.log("✅ Ubicación obtenida:", position.coords);

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      try {
        const nombreUbicacion = await obtenerNombreUbicacion(lat, lng);

        ubicacionSeleccionada = {
          lat: lat,
          lng: lng,
          nombre: nombreUbicacion,
        };

        console.log("📍 Ubicación con nombre:", ubicacionSeleccionada);

        enviarUbicacion();
      } catch (error) {
        console.error("Error obteniendo nombre de ubicación:", error);

        ubicacionSeleccionada = {
          lat: lat,
          lng: lng,
          nombre: `Ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        };
        enviarUbicacion();
      }

      locationBtn.innerHTML = originalHtml;
      locationBtn.disabled = false;
    },

    (error) => {
      console.error("❌ Error obteniendo ubicación:", error);

      let mensajeError = "No se pudo obtener la ubicación";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          mensajeError =
            "Permiso de ubicación denegado. Por favor, permite el acceso a la ubicación en tu navegador.";
          break;
        case error.POSITION_UNAVAILABLE:
          mensajeError = "La información de ubicación no está disponible.";
          break;
        case error.TIMEOUT:
          mensajeError =
            "Se agotó el tiempo de espera para obtener la ubicación.";
          break;
      }

      alert(mensajeError);

      locationBtn.innerHTML = originalHtml;
      locationBtn.disabled = false;
    },

    opcionesGeolocalizacion
  );
}

async function obtenerNombreUbicacion(lat, lng) {
  try {
    console.log("🌍 Obteniendo nombre de ubicación...");

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error("Error en la respuesta del servidor");
    }

    const data = await response.json();

    if (data && data.display_name) {
      const nombreCompleto = data.display_name;

      if (nombreCompleto.length > 100) {
        return nombreCompleto.substring(0, 100) + "...";
      }

      console.log("✅ Nombre de ubicación obtenido:", nombreCompleto);
      return nombreCompleto;
    } else {
      throw new Error("No se pudo obtener el nombre de la ubicación");
    }
  } catch (error) {
    console.warn("⚠️ No se pudo obtener nombre de ubicación:", error);

    return `Mi ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}

function enviarUbicacion() {
  if (!ubicacionSeleccionada || !chatActivoId) {
    console.error("No hay ubicación seleccionada o chat activo");
    return;
  }

  console.log("📤 Enviando ubicación:", ubicacionSeleccionada);

  const messageInput = document.getElementById("messageInput");
  const esGrupo = messageInput
    ? messageInput.getAttribute("data-esgrupo") === "true"
    : false;

  if (esGrupo) {
    socket.emit("enviar_mensaje_grupo", {
      grupo_id: parseInt(chatActivoId),
      remitente_id: parseInt(usuarioActualId),
      mensaje: `📍 ${ubicacionSeleccionada.nombre}`,
      tipo_mensaje: "ubicacion",
      ubicacion_lat: ubicacionSeleccionada.lat,
      ubicacion_lng: ubicacionSeleccionada.lng,
      ubicacion_nombre: ubicacionSeleccionada.nombre,
    });
  } else {
    socket.emit("enviar_mensaje", {
      remitente_id: parseInt(usuarioActualId),
      destinatario_id: parseInt(chatActivoId),
      mensaje: `📍 ${ubicacionSeleccionada.nombre}`,
      tipo_mensaje: "ubicacion",
      ubicacion_lat: ubicacionSeleccionada.lat,
      ubicacion_lng: ubicacionSeleccionada.lng,
      ubicacion_nombre: ubicacionSeleccionada.nombre,
    });
  }

  ubicacionSeleccionada = null;
  console.log("✅ Ubicación enviada correctamente");
}

function crearContenidoUbicacion(mensaje) {
  const hora = new Date(mensaje.fecha_envio).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const googleMapsUrl = `https://www.google.com/maps?q=${mensaje.ubicacion_lat},${mensaje.ubicacion_lng}&z=15`;

  const mapIframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    mensaje.ubicacion_lng - 0.01
  },${mensaje.ubicacion_lat - 0.01},${mensaje.ubicacion_lng + 0.01},${
    mensaje.ubicacion_lat + 0.01
  }&marker=${mensaje.ubicacion_lat},${mensaje.ubicacion_lng}`;

  return `
    <div class="message-location">
      <div class="location-map">
        <iframe 
          width="100%" 
          height="100%" 
          frameborder="0" 
          scrolling="no" 
          marginheight="0" 
          marginwidth="0" 
          src="${mapIframeUrl}"
          title="Ubicación compartida">
        </iframe>
      </div>
      <div class="location-info">
        <div class="location-name">${escapeHtml(mensaje.ubicacion_nombre)}</div>
        <a href="${googleMapsUrl}" target="_blank" class="view-map-btn">
          <i class="fas fa-external-link-alt"></i> Abrir en Google Maps
        </a>
        <div class="message-time">${hora}</div>
      </div>
    </div>
  `;
}

function configurarEventListeners() {
  document.querySelectorAll(".chat-item").forEach((item) => {
    item.addEventListener("click", function () {
      const esGrupo = this.getAttribute("data-esgrupo") === "true";
      const chatId = esGrupo
        ? this.getAttribute("data-grupoid")
        : this.getAttribute("data-userid");

      console.log("💬 Chat seleccionado:", { esGrupo, chatId });

      if (esGrupo) {
        window.location.href = `inicio.php?chat_id=${chatId}&es_grupo=1`;
      } else {
        window.location.href = `inicio.php?chat_id=${chatId}`;
      }
    });
  });

  const encryptSwitch = document.getElementById("encryptSwitch");
  if (encryptSwitch) {
    encryptSwitch.addEventListener("change", toggleEncriptacion);
  }

  const locationBtn = document.getElementById("locationBtn");
  if (locationBtn) {
    locationBtn.addEventListener("click", obtenerUbicacion);
  }

  const fileBtn = document.getElementById("fileBtn");
  if (fileBtn) {
    fileBtn.addEventListener("click", function () {
      manejarSeleccionArchivo();
    });
  }

  const sendBtn = document.getElementById("sendMessageBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", enviarMensaje);
  }

  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        enviarMensaje();
      }
    });

    messageInput.addEventListener("input", function () {
      setTimeout(manejarEscritura, 100);
    });

    messageInput.addEventListener("paste", function () {
      setTimeout(manejarEscritura, 100);
    });

    messageInput.addEventListener("keydown", function (e) {
      if (e.key === "Delete" || e.key === "Backspace") {
        setTimeout(manejarEscritura, 100);
      }
    });

    messageInput.addEventListener("blur", function () {
      setTimeout(() => {
        if (estaEscribiendo) {
          console.log("👋 Input perdió foco - limpiando estado escribiendo");
          limpiarEstadoEscritura();
        }
      }, 500);
    });
  }

  const tasksBtn = document.getElementById("tasksBtn");
  if (tasksBtn) {
    tasksBtn.addEventListener("click", mostrarModalListaTareas);
  }


  const confirmCreateTasks = document.getElementById("confirmCreateTasks");
  if (confirmCreateTasks) {
    confirmCreateTasks.addEventListener("click", crearListaTareas);
  }

  const backBtn = document.getElementById("backToChatsBtn");
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      limpiarEstadoEscritura();
      window.location.href = "inicio.php";
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
        limpiarEstadoEscritura();
        document.getElementById("logoutForm").submit();
      }
    });
  }

  const simBtn = document.getElementById("SimBtn");
  if (simBtn) {
    simBtn.addEventListener("click", function () {
      limpiarEstadoEscritura();
      window.location.href = "equipo.php";
    });
  }

  const triviaBtn = document.getElementById("triviaBtn");
  if (triviaBtn) {
    triviaBtn.addEventListener("click", function () {
      limpiarEstadoEscritura();
      const chatActivoId = document.body.getAttribute("data-chat-activo");
      window.location.href = `trivia.php?chat_id=${chatActivoId}`;
    });
  }
  const videoCallBtn = document.getElementById("videocallBtn");
  if (videoCallBtn) {
    videoCallBtn.addEventListener("click", iniciarVideollamada);
  }

  const endCallBtn = document.getElementById("endCallBtn");
  if (endCallBtn) {
    endCallBtn.addEventListener("click", finalizarVideollamada);
  }

  const toggleAudioBtn = document.getElementById("toggleAudioBtn");
  if (toggleAudioBtn) {
    toggleAudioBtn.addEventListener("click", () => {
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          toggleAudioBtn.classList.toggle("btn-danger", !audioTrack.enabled);
          toggleAudioBtn.classList.toggle("btn-secondary", audioTrack.enabled);
          toggleAudioBtn.innerHTML = audioTrack.enabled
            ? '<i class="fas fa-microphone"></i>'
            : '<i class="fas fa-microphone-slash"></i>';
        }
      }
    });
  }

  const toggleVideoBtn = document.getElementById("toggleVideoBtn");
  if (toggleVideoBtn) {
    toggleVideoBtn.addEventListener("click", () => {
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          toggleVideoBtn.classList.toggle("btn-danger", !videoTrack.enabled);
          toggleVideoBtn.classList.toggle("btn-secondary", videoTrack.enabled);
          toggleVideoBtn.innerHTML = videoTrack.enabled
            ? '<i class="fas fa-video"></i>'
            : '<i class="fas fa-video-slash"></i>';
        }
      }
    });
  }
  configurarEventListenersGrupos();
}



function configurarEventListenersGrupos() {
  console.log("🔧 Configurando event listeners para grupos...");

  const createGroupBtn = document.getElementById("createGroupBtn");
  if (createGroupBtn) {
    console.log("✅ Botón crear grupo encontrado");

    const newBtn = createGroupBtn.cloneNode(true);
    createGroupBtn.parentNode.replaceChild(newBtn, createGroupBtn);

    document
      .getElementById("createGroupBtn")
      .addEventListener("click", function (event) {
        console.log("🎯 Evento click capturado en crear grupo");
        event.preventDefault();
        event.stopPropagation();
        mostrarModalCrearGrupo();
      });
  }

  document.querySelectorAll(".group-member-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", actualizarContadorMiembros);
  });

  const confirmCreateGroup = document.getElementById("confirmCreateGroup");
  if (confirmCreateGroup) {
    const newConfirmBtn = confirmCreateGroup.cloneNode(true);
    confirmCreateGroup.parentNode.replaceChild(
      newConfirmBtn,
      confirmCreateGroup
    );

    document
      .getElementById("confirmCreateGroup")
      .addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        crearGrupo();
      });
  }

 
  const modalElement = document.getElementById("createGroupModal");
  if (modalElement) {
    const cancelBtn = modalElement.querySelector(
      '.btn-secondary[data-bs-dismiss="modal"]'
    );
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        console.log("❌ Cancelar creación de grupo");
        limpiarModalRestos();
      });
    }

    modalElement.addEventListener("hidden.bs.modal", function () {
      console.log("🎯 Modal ocultado, limpiando restos");
      limpiarModalRestos();
    });
  }
}

function limpiarModalRestos() {
  console.log("🧹 Iniciando limpieza de modal...");

  document.querySelectorAll(".modal").forEach((modalElement) => {
    if (modalElement.id !== "videoCallModal" || !isInCall) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  });

  setTimeout(() => {
    document.querySelectorAll(".modal-backdrop").forEach((b) => {
      console.log("🗑️ Eliminando backdrop:", b);
      b.remove();
    });

   
    document.querySelectorAll(".modal").forEach((modalElement) => {
      if (modalElement.id !== "videoCallModal" || !isInCall) {
        modalElement.remove();
      }
    });

 
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";

    document.body.removeAttribute("style");

    console.log("✅ Limpieza de modal completada");
  }, 300);
}

function mostrarModalCrearGrupo() {
  console.log("📝 Mostrando modal para crear grupo...");

 
  const modalElement = document.getElementById("createGroupModal");
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  } else {
    console.error("❌ No se encontró el modal createGroupModal");
  }
}

window.mostrarModalCrearGrupo = mostrarModalCrearGrupo;

function actualizarContadorMiembros() {
  const checkboxes = document.querySelectorAll(
    ".group-member-checkbox:checked"
  );
  const countText = document.getElementById("memberCountText");
  const confirmBtn = document.getElementById("confirmCreateGroup");

  if (countText) countText.textContent = `Seleccionados: ${checkboxes.length}`;
  if (confirmBtn) confirmBtn.disabled = checkboxes.length < 2;
}

function limpiarModalRestos() {
  console.log("🧹 Iniciando limpieza de modal...");

  document.querySelectorAll(".modal").forEach((modalElement) => {
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
  });

  document.querySelectorAll(".modal-backdrop").forEach((b) => {
    console.log("🗑️ Eliminando backdrop:", b);
    b.remove();
  });

  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";

  document.body.removeAttribute("style");

  console.log("✅ Limpieza de modal completada");
}

function crearGrupo() {
  if (window.creandoGrupo) {
    console.log("⏳ Ya se está creando un grupo, espera...");
    return;
  }

  window.creandoGrupo = true;

  const groupNameEl = document.getElementById("groupName");
  const groupName = groupNameEl ? groupNameEl.value.trim() : "";
  const selectedMembers = Array.from(
    document.querySelectorAll(".group-member-checkbox:checked")
  ).map((checkbox) => checkbox.value);

  if (!groupName) {
    alert("Por favor ingresa un nombre para el grupo");
    window.creandoGrupo = false;
    return;
  }

  if (selectedMembers.length < 2) {
    alert("Debes seleccionar al menos 2 miembros adicionales para el grupo");
    window.creandoGrupo = false;
    return;
  }

  const confirmBtn = document.getElementById("confirmCreateGroup");
  const originalText = confirmBtn ? confirmBtn.innerHTML : null;
  if (confirmBtn) {
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    confirmBtn.disabled = true;
  }

  const formData = new FormData();
  formData.append("nombre_grupo", groupName);

  selectedMembers.forEach((memberId) => {
    formData.append("miembros_ids[]", memberId);
  });

  fetch("crear_grupo.php", {
    method: "POST",
    body: formData,
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      if (data && data.success) {
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("createGroupModal")
        );
        if (modal) modal.hide();
        limpiarModalRestos();
        alert("Grupo creado exitosamente");
        window.location.reload();
      } else {
        throw new Error(
          data && data.error ? data.error : "Respuesta de servidor desconocida"
        );
      }
    })
    .catch((err) => {
      console.error("crearGrupo error:", err);
      alert("Error al crear grupo: " + (err.message || err));
      limpiarModalRestos();
    })
    .finally(() => {
      window.creandoGrupo = false;
      if (confirmBtn && originalText !== null) {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
      }
    });
}

function cargarGruposUsuario() {
  console.log("Cargando grupos del usuario...");
}

function agregarMensajeGrupoALaVista(mensaje) {
  const container = document.getElementById("messagesContainer");
  if (!container) return;

  const estabaAlFinal = isScrolledToBottom(container);
 
  const mensajeProcesado = procesarMensajeRecibido(mensaje);

  const mensajeElement = crearElementoMensajeGrupo(mensajeProcesado);
  container.appendChild(mensajeElement);

  if (estabaAlFinal) {
    scrollToBottom();
  }
}

function crearElementoMensajeGrupo(mensaje) {
  const esMio = parseInt(mensaje.remitente_id) === parseInt(usuarioActualId);
  const clase = esMio ? "sent" : "received";
  const hora = new Date(mensaje.fecha_envio).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const div = document.createElement("div");
  div.className = `message ${clase}`;

  let nombreRemitente = "";
  if (!esMio) {
    nombreRemitente = `<div class="message-sender">${escapeHtml(
      mensaje.remitente_nombre || "Usuario"
    )}</div>`;
  }

  let contenido = "";

  if (mensaje.tipo_mensaje === "ubicacion") {
    contenido = crearContenidoUbicacion(mensaje);
  } else if (mensaje.tipo_mensaje === "archivo") {
    contenido = crearContenidoArchivo(mensaje);
  } else {
    contenido = `
      <div class="message-text">${escapeHtml(mensaje.mensaje)}</div>
      <div class="message-time">${hora}</div>
    `;
  }

  div.innerHTML = contenido;
  return div;
}

function mostrarModalListaTareas() {
  console.log("📝 Mostrando modal para lista de tareas...");

  document.getElementById("tasksList").innerHTML = `
        <div class="task-item mb-2">
            <div class="input-group">
                <input type="text" class="form-control task-input" placeholder="Descripción de la tarea" required>
                <button type="button" class="btn btn-outline-danger remove-task-btn" disabled>
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="task-item mb-2">
            <div class="input-group">
                <input type="text" class="form-control task-input" placeholder="Descripción de la tarea" required>
                <button type="button" class="btn btn-outline-danger remove-task-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;

  actualizarContadorTareas();
  configurarEventListenersTareas();

  const modal = new bootstrap.Modal(
    document.getElementById("createTasksModal")
  );
  modal.show();
}

function configurarEventListenersTareas() {
  
  document.getElementById("addTaskBtn").addEventListener("click", agregarTarea);

 
  document.querySelectorAll(".task-input").forEach((input) => {
    input.addEventListener("input", actualizarContadorTareas);
  });

  document.querySelectorAll(".remove-task-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      if (!this.disabled) {
        this.closest(".task-item").remove();
        actualizarContadorTareas();
      }
    });
  });
}

function agregarTarea() {
  const tasksList = document.getElementById("tasksList");
  const newTask = document.createElement("div");
  newTask.className = "task-item mb-2";
  newTask.innerHTML = `
        <div class="input-group">
            <input type="text" class="form-control task-input" placeholder="Descripción de la tarea" required>
            <button type="button" class="btn btn-outline-danger remove-task-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
  tasksList.appendChild(newTask);

  
  newTask
    .querySelector(".task-input")
    .addEventListener("input", actualizarContadorTareas);
  newTask
    .querySelector(".remove-task-btn")
    .addEventListener("click", function () {
      this.closest(".task-item").remove();
      actualizarContadorTareas();
    });

  actualizarContadorTareas();
}

function actualizarContadorTareas() {
  const tasks = document.querySelectorAll(".task-input");
  const taskCount = tasks.length;
  const taskCountText = document.getElementById("taskCountText");
  const confirmBtn = document.getElementById("confirmCreateTasks");

  let validTasks = 0;
  tasks.forEach((task) => {
    if (task.value.trim().length > 0) {
      validTasks++;
    }
  });

  if (taskCountText) {
    taskCountText.textContent = `Tareas: ${validTasks}/${taskCount} (mínimo 2)`;
    taskCountText.className =
      validTasks >= 2
        ? "text-success d-block mt-1"
        : "text-danger d-block mt-1";
  }

  if (confirmBtn) {
    confirmBtn.disabled = validTasks < 2;
  }

  
  const removeButtons = document.querySelectorAll(".remove-task-btn");
  removeButtons.forEach((btn, index) => {
    btn.disabled = removeButtons.length <= 2 && index < 2;
  });
}

function crearListaTareas() {
  if (window.creandoListaTareas) return;
  window.creandoListaTareas = true;

  const tasks = Array.from(document.querySelectorAll(".task-input"))
    .map((input) => input.value.trim())
    .filter((text) => text.length > 0);

  if (tasks.length < 2) {
    alert("Debes agregar al menos 2 tareas válidas");
    window.creandoListaTareas = false;
    return;
  }

  const confirmBtn = document.getElementById("confirmCreateTasks");
  const originalText = confirmBtn ? confirmBtn.innerHTML : null;

  if (confirmBtn) {
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    confirmBtn.disabled = true;
  }

  
  socket.emit("crear_lista_tareas", {
    grupo_id: parseInt(chatActivoId),
    remitente_id: parseInt(usuarioActualId),
    tareas: tasks,
  });

  
  setTimeout(() => {
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("createTasksModal")
    );
    if (modal) modal.hide();
    window.creandoListaTareas = false;

    if (confirmBtn && originalText !== null) {
      confirmBtn.innerHTML = originalText;
      confirmBtn.disabled = false;
    }
  }, 1000);
}

function completarTarea(tareaId, checkbox) {
  if (checkbox.checked) {
    console.log(`✅ Completando tarea ${tareaId}`);

    socket.emit("completar_tarea", {
      tarea_id: tareaId,
      usuario_id: parseInt(usuarioActualId),
      grupo_id: parseInt(chatActivoId),
    });

    
    checkbox.disabled = true;
    checkbox.parentElement.classList.add("task-completed");
  }
}



async function enviarArchivo() {
  if (!archivoTemporal) {
    throw new Error("No hay archivo para enviar");
  }

  if (!chatActivoId) {
    alert("Selecciona un chat para compartir archivo");
    return;
  }

  
  limpiarModalRestos();

  try {
    const datosSubida = await subirArchivoAlServidor(archivoTemporal);
    const messageInput = document.getElementById("messageInput");
    const esGrupo = messageInput
      ? messageInput.getAttribute("data-esgrupo") === "true"
      : false;
    const datosArchivo = {
      remitente_id: parseInt(usuarioActualId),
      mensaje: `📎 ${datosSubida.nombre}`,
      tipo_mensaje: "archivo",
      archivoNombre: datosSubida.nombre,
      archivoTipo: datosSubida.tipo,
      archivoSize: datosSubida.tamaño,
      archivoPath: datosSubida.ruta,
    };

    console.log("📊 Datos del archivo a enviar:", datosArchivo);

    if (esGrupo) {
      datosArchivo.grupo_id = parseInt(chatActivoId);
      socket.emit("enviar_mensaje_grupo", datosArchivo);
    } else {
      datosArchivo.destinatario_id = parseInt(chatActivoId);
      socket.emit("enviar_mensaje", datosArchivo);
    }
  } catch (error) {
    console.error("Error enviando archivo:", error);
    throw error;
  }

  archivoTemporal = null;

  console.log("✅ Archivo enviado correctamente");
}

async function manejarSeleccionArchivo() {
  if (!chatActivoId) {
    alert("Selecciona un chat para compartir archivo");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "*/*";
  input.style.display = "none";

  input.onchange = async function (e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    
    if (archivo.size > 10 * 1024 * 1024) {
      alert("El archivo es demasiado grande. Máximo 10MB.");
      return;
    }

    archivoTemporal = archivo;

    try {
      if (archivo.type.startsWith("image/")) {
        console.log("🖼️ Mostrando preview de imagen");
        mostrarPreviewImagen(archivo);
      } else {
        console.log("📄 Procesando archivo general");
        if (confirm(`¿Enviar archivo "${archivo.name}"?`)) {
          await enviarArchivo();
        } else {
          limpiarArchivoTemporal();
        }
      }
    } catch (error) {
      console.error("Error procesando archivo:", error);
      alert("Error al procesar el archivo");
      limpiarArchivoTemporal();
    }
  };

  document.body.appendChild(input);
  input.click();
  setTimeout(() => {
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
  }, 1000);
}

function mostrarPreviewImagen(archivo) {
  const reader = new FileReader();

  reader.onload = function (e) {
    
    limpiarModalRestos();

    const modalHtml = `
      <div class="modal fade" id="imagePreviewModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Vista previa de imagen</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center">
              <img src="${
                e.target.result
              }" class="img-fluid mb-3" style="max-height: 400px; max-width: 100%;">
              <p><strong>${archivo.name}</strong> (${(
      archivo.size / 1024
    ).toFixed(2)} KB)</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="sendImageBtn">Enviar imagen</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const modalElement = document.getElementById("imagePreviewModal");
    const modal = new bootstrap.Modal(modalElement);

    modalElement.addEventListener("shown.bs.modal", function () {
      modalElement.removeAttribute("aria-hidden");
      const sendBtn = document.getElementById("sendImageBtn");
      if (sendBtn) {
        sendBtn.onclick = async function () {
          
          this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
          this.disabled = true;

          try {
            await enviarArchivo();
            modal.hide();
          } catch (error) {
            alert("Error al enviar la imagen: " + error.message);
            this.innerHTML = "Enviar imagen";
            this.disabled = false;
          }
        };
      }

      
      const cancelBtn = document.getElementById("cancelImageBtn");
      if (cancelBtn) {
        cancelBtn.onclick = function () {
          limpiarArchivoTemporal();
          modal.hide();
        };
      }
    });

    modalElement.addEventListener("hidden.bs.modal", function () {
      modalElement.setAttribute("aria-hidden", "true");
      if (archivoTemporal) {
        limpiarArchivoTemporal();
      }
      setTimeout(() => {
        if (document.body.contains(modalElement)) {
          modalElement.remove();
        }
        limpiarModalRestos();
      }, 300);
    });

    modal.show();
  };

  reader.readAsDataURL(archivo);
}

function crearContenidoArchivo(mensaje) {
  const hora = new Date(mensaje.fecha_envio).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const esImagen =
    mensaje.archivoTipo && mensaje.archivoTipo.startsWith("image/");
  const tamañoFormateado = mensaje.archivoSize
    ? formatBytes(mensaje.archivoSize)
    : "Tamaño desconocido";
  const nombreArchivo = mensaje.archivoNombre || "archivo";
  const rutaArchivo = mensaje.archivoPath || "#";

  if (esImagen) {
    return `
      <div class="message-file">
        <div class="file-preview image-preview">
          <img src="${rutaArchivo}" alt="${nombreArchivo}" 
               onclick="ampliarImagen('${rutaArchivo}')">
        </div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(nombreArchivo)}</div>
          <div class="file-size">${tamañoFormateado}</div>
          <a href="${rutaArchivo}" download="${nombreArchivo}" class="download-btn">
            <i class="fas fa-download"></i> Descargar
          </a>
          <div class="message-time">${hora}</div>
        </div>
      </div>
    `;
  } else {
    const icono = obtenerIconoArchivo(mensaje.archivoTipo, nombreArchivo);

    return `
      <div class="message-file">
        <div class="file-preview">
          <i class="fas ${icono} fa-2x"></i>
        </div>
        <div class="file-info">
          <div class="file-name">${escapeHtml(nombreArchivo)}</div>
          <div class="file-size">${tamañoFormateado}</div>
          <a href="${rutaArchivo}" download="${nombreArchivo}" class="download-btn">
            <i class="fas fa-download"></i> Descargar
          </a>
          <div class="message-time">${hora}</div>
        </div>
      </div>
    `;
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function obtenerIconoArchivo(tipo, nombre) {
  
  if (!nombre) return "fa-file";

  if (tipo) {
    if (tipo.startsWith("image/")) return "fa-file-image";
    if (tipo.startsWith("video/")) return "fa-file-video";
    if (tipo.startsWith("audio/")) return "fa-file-audio";
    if (tipo.includes("pdf")) return "fa-file-pdf";
    if (tipo.includes("word") || tipo.includes("document"))
      return "fa-file-word";
    if (tipo.includes("excel") || tipo.includes("spreadsheet"))
      return "fa-file-excel";
    if (tipo.includes("zip") || tipo.includes("compressed"))
      return "fa-file-archive";
  }

  
  const partes = nombre.split(".");
  if (partes.length > 1) {
    const extension = partes.pop().toLowerCase();
    if (["doc", "docx"].includes(extension)) return "fa-file-word";
    if (["xls", "xlsx"].includes(extension)) return "fa-file-excel";
    if (["pdf"].includes(extension)) return "fa-file-pdf";
    if (["zip", "rar", "7z"].includes(extension)) return "fa-file-archive";
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension))
      return "fa-file-image";
    if (["mp4", "avi", "mov", "wmv", "mkv"].includes(extension))
      return "fa-file-video";
    if (["mp3", "wav", "ogg", "flac"].includes(extension))
      return "fa-file-audio";
  }

  return "fa-file";
}

function ampliarImagen(src) {
  
  const modalExistente = document.querySelector(".image-modal");
  if (modalExistente) {
    modalExistente.remove();
    return;
  }

  
  const modalHtml = `
        <div class="image-modal">
            <img src="${src}" alt="Imagen ampliada">
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  
  document.querySelector(".image-modal").addEventListener("click", function () {
    this.remove();
  });

  
  const closeOnEscape = function (e) {
    if (e.key === "Escape") {
      const modal = document.querySelector(".image-modal");
      if (modal) modal.remove();
      document.removeEventListener("keydown", closeOnEscape);
    }
  };
  document.addEventListener("keydown", closeOnEscape);
}

async function subirArchivoAlServidor(archivo) {
  const formData = new FormData();
  formData.append("archivo", archivo);
  formData.append("usuario_id", usuarioActualId);

  const response = await fetch("subir_archivo.php", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Error en la respuesta del servidor");
  }

  const resultado = await response.json();
  return resultado;
}

function procesarMensajeRecibido(mensaje) {
  
  if (mensaje.encriptado || (mensaje.mensaje && mensaje.mensaje.length > 50)) {
    const mensajeDesencriptado = desencriptarMensaje(mensaje.mensaje);
    return {
      ...mensaje,
      mensaje: mensajeDesencriptado,
      fueEncriptado: true,
    };
  }
  return mensaje;
}

function limpiarArchivoTemporal() {
  archivoTemporal = null;
  console.log("🧹 Archivo temporal limpiado");
}

function limpiarBackdrops() {
  
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.remove();
  });

  
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
}

window.addEventListener("load", function () {
  document.querySelectorAll(".chat-item .last-message").forEach((element) => {
    if (!element.getAttribute("data-mensaje-original")) {
      element.setAttribute("data-mensaje-original", element.textContent);
    }
  });
});
