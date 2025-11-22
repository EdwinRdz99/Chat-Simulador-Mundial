<?php
session_start();
include("configuracion.php");

if (!isset($_SESSION['usuario_id'])) {
  header("Location: ../archivos_php/login.php");
  exit();
}

if (isset($_POST['logout'])) {
  session_destroy();
  header("Location: ../archivos_php/login.php");
  exit();
}

$conexion = new mysqli($server, $user, $pass, $bd);

$usuario_actual_id = $_SESSION['usuario_id'];
$usuario_actual_nombre = $_SESSION['usuario_nombre'];

$nivel_usuario_query = $conexion->prepare("
    SELECT un.puntos
    FROM usuario_nivel un 
    WHERE un.usuario_id = ?
");
$nivel_usuario_query->bind_param("i", $usuario_actual_id);
$nivel_usuario_query->execute();
$nivel_usuario_result = $nivel_usuario_query->get_result();

if ($nivel_usuario_result->num_rows > 0) {
  $nivel_data = $nivel_usuario_result->fetch_assoc();
  $puntos_usuario = $nivel_data['puntos'];

  $nivel_correcto_query = $conexion->prepare("
        SELECT nombre 
        FROM nivel 
        WHERE puntos_requeridos <= ? 
        ORDER BY puntos_requeridos DESC 
        LIMIT 1
    ");
  $nivel_correcto_query->bind_param("i", $puntos_usuario);
  $nivel_correcto_query->execute();
  $nivel_correcto_result = $nivel_correcto_query->get_result();

  if ($nivel_correcto_result->num_rows > 0) {
    $nivel_correcto_data = $nivel_correcto_result->fetch_assoc();
    $nivel_usuario_actual = $nivel_correcto_data['nombre'];
  } else {
    $nivel_usuario_actual = "Novato";
  }
  $nivel_correcto_query->close();
} else {
  $insert_nivel = $conexion->prepare("
        INSERT INTO usuario_nivel (usuario_id, nivel_id, puntos) 
        VALUES (?, 1, 0)
    ");
  $insert_nivel->bind_param("i", $usuario_actual_id);
  $insert_nivel->execute();
  $insert_nivel->close();
  $nivel_usuario_actual = "Novato";
}
$nivel_usuario_query->close();

$usuarios_query = $conexion->prepare("
    SELECT u.id, u.nombre, u.email, 
           MAX(m.fecha_envio) as ultima_fecha,
           (SELECT mensaje FROM mensajes 
            WHERE ((remitente_id = ? AND destinatario_id = u.id) 
                   OR (remitente_id = u.id AND destinatario_id = ?)) 
            ORDER BY fecha_envio DESC LIMIT 1) as ultimo_mensaje,
           (SELECT remitente_id FROM mensajes 
            WHERE ((remitente_id = ? AND destinatario_id = u.id) 
                   OR (remitente_id = u.id AND destinatario_id = ?)) 
            ORDER BY fecha_envio DESC LIMIT 1) as ultimo_remitente_id
    FROM usuario u
    LEFT JOIN mensajes m ON ((m.remitente_id = ? AND m.destinatario_id = u.id) 
                            OR (m.remitente_id = u.id AND m.destinatario_id = ?))
    WHERE u.id != ?
    GROUP BY u.id, u.nombre, u.email
    ORDER BY ultima_fecha DESC, u.nombre ASC
");
$usuarios_query->bind_param(
  "iiiiiii",
  $usuario_actual_id,
  $usuario_actual_id,
  $usuario_actual_id,
  $usuario_actual_id,
  $usuario_actual_id,
  $usuario_actual_id,
  $usuario_actual_id
);
$usuarios_query->execute();
$usuarios_result = $usuarios_query->get_result();

$usuarios_con_mensajes = [];
while ($usuario = $usuarios_result->fetch_assoc()) {
  $ultimo_mensaje = "";

  if (!empty($usuario['ultimo_mensaje'])) {

    
    $mensaje_original = $usuario['ultimo_mensaje'];
    $es_encriptado = (strpos($mensaje_original, 'U2FsdGVkX1') === 0);

    if ($es_encriptado) {
     
      if ($usuario['ultimo_remitente_id'] == $usuario_actual_id) {
        $ultimo_mensaje = "Tú: 🔒 Mensaje encriptado";
      } else {
        $ultimo_mensaje = "🔒 Mensaje encriptado";
      }
    } else {
      
      if ($usuario['ultimo_remitente_id'] == $usuario_actual_id) {
        $ultimo_mensaje = "Tú: " . $mensaje_original;
      } else {
        $ultimo_mensaje = $mensaje_original;
      }

     
      if (strlen($ultimo_mensaje) > 35) {
        $ultimo_mensaje = substr($ultimo_mensaje, 0, 35) . "...";
      }
    }

  } else {
    $ultimo_mensaje = "No hay mensajes aún";
  }

  $usuario['ultimo_mensaje'] = $ultimo_mensaje;
  $usuarios_con_mensajes[] = $usuario;
}

$chat_activo_id = isset($_GET['chat_id']) ? $_GET['chat_id'] : null;
$es_grupo = isset($_GET['es_grupo']) ? true : false;
$chat_activo_nombre = "";
$chat_activo_email = "";

if ($chat_activo_id) {

  $_SESSION['chat_activo'] = $chat_activo_id;

  if ($es_grupo) {

    $chat_query = $conexion->prepare("SELECT id, nombre, creador_id FROM grupos WHERE id = ?");
    $chat_query->bind_param("i", $chat_activo_id);
    $chat_query->execute();
    $chat_result = $chat_query->get_result();

    if ($chat_result->num_rows > 0) {
      $chat_data = $chat_result->fetch_assoc();
      $chat_activo_nombre = $chat_data['nombre'];
      $chat_activo_email = "Grupo";
    }
    $chat_query->close();
  } else {

    $chat_query = $conexion->prepare("SELECT id, nombre, email FROM usuario WHERE id = ?");
    $chat_query->bind_param("i", $chat_activo_id);
    $chat_query->execute();
    $chat_result = $chat_query->get_result();

    if ($chat_result->num_rows > 0) {
      $chat_data = $chat_result->fetch_assoc();
      $chat_activo_nombre = $chat_data['nombre'];
      $chat_activo_email = $chat_data['email'];
    }
    $chat_query->close();
  }
} else {

  unset($_SESSION['chat_activo']);
}

$usuarios_query->close();

$grupos_query = $conexion->prepare("
    SELECT g.id, g.nombre, g.creador_id, 
           MAX(mg.fecha_envio) as ultima_fecha,
           (SELECT mensaje FROM mensajes_grupo 
            WHERE grupo_id = g.id 
            ORDER BY fecha_envio DESC LIMIT 1) as ultimo_mensaje,
           (SELECT remitente_id FROM mensajes_grupo 
            WHERE grupo_id = g.id 
            ORDER BY fecha_envio DESC LIMIT 1) as ultimo_remitente_id,
           u.nombre as creador_nombre
    FROM grupos g
    JOIN grupo_usuarios gu ON g.id = gu.grupo_id
    JOIN usuario u ON g.creador_id = u.id
    LEFT JOIN mensajes_grupo mg ON g.id = mg.grupo_id
    WHERE gu.usuario_id = ?
    GROUP BY g.id, g.nombre, g.creador_id, u.nombre
    ORDER BY ultima_fecha DESC, g.nombre ASC
");
$grupos_query->bind_param("i", $usuario_actual_id);
$grupos_query->execute();
$grupos_result = $grupos_query->get_result();

$grupos_con_mensajes = [];
while ($grupo = $grupos_result->fetch_assoc()) {
  $ultimo_mensaje = "";

  if (!empty($grupo['ultimo_mensaje'])) {

   
    $mensaje_original = $grupo['ultimo_mensaje'];
    $es_encriptado = (strpos($mensaje_original, 'U2FsdGVkX1') === 0);

    if ($es_encriptado) {
      
      if ($grupo['ultimo_remitente_id'] == $usuario_actual_id) {
        $ultimo_mensaje = "Tú: 🔒 Mensaje Encriptado";
      } else {

        $remitente_query = $conexion->prepare("SELECT nombre FROM usuario WHERE id = ?");
        $remitente_query->bind_param("i", $grupo['ultimo_remitente_id']);
        $remitente_query->execute();
        $remitente_result = $remitente_query->get_result();

        if ($remitente_data = $remitente_result->fetch_assoc()) {
          $ultimo_mensaje = $remitente_data['nombre'] . ": 🔒";
        } else {
          $ultimo_mensaje = "🔒 Mensaje encriptado";
        }
        $remitente_query->close();
      }
    } else {

      if ($grupo['ultimo_remitente_id'] == $usuario_actual_id) {
        $ultimo_mensaje = "Tú: " . $grupo['ultimo_mensaje'];
      } else {
        $remitente_query = $conexion->prepare("SELECT nombre FROM usuario WHERE id = ?");
        $remitente_query->bind_param("i", $grupo['ultimo_remitente_id']);
        $remitente_query->execute();
        $remitente_result = $remitente_query->get_result();

        if ($remitente_data = $remitente_result->fetch_assoc()) {
          $ultimo_mensaje = $remitente_data['nombre'] . ": " . $grupo['ultimo_mensaje'];
        } else {
          $ultimo_mensaje = $grupo['ultimo_mensaje'];
        }
        $remitente_query->close();
      }

      
      if (strlen($ultimo_mensaje) > 35) {
        $ultimo_mensaje = substr($ultimo_mensaje, 0, 35) . "...";
      }
    }

  } else {
    $ultimo_mensaje = "No hay mensajes aún";
  }

  $grupo['ultimo_mensaje'] = $ultimo_mensaje;
  $grupos_con_mensajes[] = $grupo;
}

$grupos_query->close();
$conexion->close();
?>

<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mundial 2026 - App Social</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet"
    integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="../css/inicio.css" />
  <link rel="stylesheet" href="../css/videocall.css" />

  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js"></script>
  <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
  <!-- CryptoJS -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
  <script>

    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });


    socket.on('connect', () => {
      console.log('✅ CONECTADO al servidor Node.js');
      console.log('Socket ID:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ DESCONECTADO del servidor');
    });

    socket.on('connect_error', (error) => {
      console.log('❌ ERROR de conexión:', error);
    });
  </script>
</head>

<body data-usuario-id="<?php echo $usuario_actual_id; ?>" data-chat-activo="<?php echo $chat_activo_id ?: ''; ?>"
  data-es-grupo="<?php echo $es_grupo ? 'true' : 'false'; ?>">

  <form id="logoutForm" method="POST" style="display: none;">
    <input type="hidden" name="logout" value="1">
  </form>

  <header class="header">
    <div class="logo">MUNDIAL 2026</div>
    <div class="user-actions">
      <span style="color: white; margin-right: 15px;">Hola,
        <?php echo htmlspecialchars($usuario_actual_nombre); ?>
        <span class="badge bg-warning text-dark">Nivel: <?php echo htmlspecialchars($nivel_usuario_actual); ?></span>
      </span>
      <button class="btn btn-primary" id="SimBtn">Simulador</button>
      <button class="btn btn-info" id="statsBtn" onclick="window.location.href='estadisticas.php'">Estadísticas</button>
      <button class="btn btn-primary" id="logoutBtn">Cerrar Sesión</button>
    </div>
  </header>

  <div class="main-container">
    <div class="sidebar" id="chatsSidebar">
      <div class="search-container">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input type="text" id="searchUsers" placeholder="Buscar usuarios..." />
        </div>
      </div>

      <div class="create-group-container" style="padding: 10px; border-bottom: 1px solid #eee;">
        <button class="btn btn-success btn-sm w-100" id="createGroupBtn" onclick="mostrarModalCrearGrupo()">
          <i class="fas fa-users me-2"></i>Crear Grupo
        </button>
      </div>

      <div class="chats-list" id="usersList">
        <?php

        if (count($grupos_con_mensajes) > 0) {
          foreach ($grupos_con_mensajes as $grupo) {
            $iniciales = getIniciales($grupo['nombre']);
            $esta_activo = ($grupo['id'] == $chat_activo_id && $es_grupo) ? 'active' : '';

            echo '<div class="chat-item group-chat-item ' . $esta_activo . '" data-grupoid="' . $grupo['id'] . '" data-esgrupo="true">';
            echo '<div class="avatar group-avatar">';
            echo '<span>' . $iniciales . '</span>';
            echo '<div class="status-indicator online"></div>';
            echo '</div>';
            echo '<div class="chat-info">';
            echo '<div class="chat-name">' . htmlspecialchars($grupo['nombre']) . ' <small>(Grupo)</small></div>';
            echo '<div class="last-message" data-mensaje-original="' . htmlspecialchars($grupo['ultimo_mensaje']) . '">' . htmlspecialchars($grupo['ultimo_mensaje']) . '</div>';
            echo '</div>';
            echo '</div>';
          }
        }

        if (count($usuarios_con_mensajes) > 0) {
          foreach ($usuarios_con_mensajes as $usuario) {
            $iniciales = getIniciales($usuario['nombre']);
            $esta_activo = ($usuario['id'] == $chat_activo_id && !$es_grupo) ? 'active' : '';

            echo '<div class="chat-item ' . $esta_activo . '" data-userid="' . $usuario['id'] . '" data-esgrupo="false">';
            echo '<div class="avatar">';
            echo '<span>' . $iniciales . '</span>';
            echo '<div class="status-indicator online"></div>';
            echo '</div>';
            echo '<div class="chat-info">';
            echo '<div class="chat-name">' . htmlspecialchars($usuario['nombre']) . '</div>';
            echo '<div class="last-message" data-mensaje-original="' . htmlspecialchars($usuario['ultimo_mensaje']) . '">' . htmlspecialchars($usuario['ultimo_mensaje']) . '</div>';
            echo '</div>';
            echo '</div>';
          }
        }

        if (count($grupos_con_mensajes) == 0 && count($usuarios_con_mensajes) == 0) {
          echo '<div style="padding: 1rem; text-align: center; color: #666;">No hay chats disponibles</div>';
        }
        ?>
      </div>
    </div>

    <div class="chat-area" id="mainChatArea" style="<?php echo !$chat_activo_id ? 'display: none;' : ''; ?>">
      <?php if ($chat_activo_id): ?>
        <div class="chat-header">
          <button class="back-to-chats" id="backToChatsBtn">
            <i class="fas fa-arrow-left"></i>
          </button>
          <div class="avatar <?php echo $es_grupo ? 'group-avatar' : ''; ?>">
            <span><?php echo getIniciales($chat_activo_nombre); ?></span>
            <div class="status-indicator online"></div>
          </div>
          <div class="current-chat-info">
            <div class="current-chat-name">
              <?php echo htmlspecialchars($chat_activo_nombre); ?>
              <?php if (!$es_grupo): ?>
                <span class="current-chat-email">(<?php echo htmlspecialchars($chat_activo_email); ?>)</span>
              <?php else: ?>
                <span class="current-chat-email">(Grupo)</span>
              <?php endif; ?>
            </div>
            <div class="current-chat-status">En línea</div>
          </div>
          <div class="chat-actions">
            <?php if (!$es_grupo): ?>
              <button class="action-btn" title="Trivia" id="triviaBtn">
                <i class="fas fa-book"></i>
              </button>
              <button class="action-btn" title="Videollamada" id="videocallBtn">
                <i class="fas fa-video"></i>
              </button>
            <?php else: ?>
              <!-- Botón para crear lista de tareas (solo en grupos) -->
              <button class="action-btn" title="Crear lista de tareas" id="tasksBtn">
                <i class="fas fa-tasks"></i>
              </button>
            <?php endif; ?>
          </div>
        </div>

        <div class="messages-container" id="messagesContainer">

        </div>

        <div class="message-input-container">
          <div class="form-check form-switch me-2" title="Encriptar mensajes">
            <input class="form-check-input" type="checkbox" id="encryptSwitch">
            <label class="form-check-label" for="encryptSwitch">
              <i class="fas fa-lock"></i>
            </label>
          </div>
          <button class="location-btn" id="locationBtn" title="Compartir ubicación">
            <i class="fas fa-map-marker-alt"></i>
          </button>
          <button class="file-btn" id="fileBtn" title="Compartir archivo">
            <i class="fa-solid fa-file"></i>
          </button>
          <input type="text" class="message-input" id="messageInput" placeholder="Escribe un mensaje..."
            data-destinatario="<?php echo $chat_activo_id; ?>"
            data-esgrupo="<?php echo $es_grupo ? 'true' : 'false'; ?>" />
          <button class="send-btn" id="sendMessageBtn" title="Enviar">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      <?php else: ?>
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #666;">
          Selecciona un chat para comenzar a conversar
        </div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Modal para crear lista de tareas -->
  <div class="modal fade" id="createTasksModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Crear Lista de Tareas</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="createTasksForm">
            <div class="mb-3">
              <label class="form-label">Tareas (mínimo 2)</label>
              <div id="tasksList">
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
              </div>
              <button type="button" class="btn btn-sm btn-outline-primary mt-2" id="addTaskBtn">
                <i class="fas fa-plus"></i> Agregar otra tarea
              </button>
              <small class="text-muted d-block mt-1" id="taskCountText">Tareas: 2</small>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-primary" id="confirmCreateTasks" disabled>Crear Lista</button>
        </div>
      </div>
    </div>
  </div>

  <?php if (!$es_grupo && $chat_activo_id): ?>
    <div id="videoCallModal" class="modal fade" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Videollamada</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="video-container">
              <video id="remoteVideo" autoplay playsinline></video>
              <video id="localVideo" autoplay playsinline muted></video>
            </div>
            <div class="call-controls">
              <button id="endCallBtn" class="btn btn-danger">
                <i class="fas fa-phone-slash"></i>
              </button>
              <button id="toggleAudioBtn" class="btn btn-secondary">
                <i class="fas fa-microphone"></i>
              </button>
              <button id="toggleVideoBtn" class="btn btn-secondary">
                <i class="fas fa-video"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  <?php endif; ?>

  <div class="modal fade" id="createGroupModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Crear Nuevo Grupo</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="createGroupForm">
            <div class="mb-3">
              <label for="groupName" class="form-label">Nombre del Grupo</label>
              <input type="text" class="form-control" id="groupName" required placeholder="Ingresa el nombre del grupo">
            </div>
            <div class="mb-3">
              <label class="form-label">Seleccionar Integrantes (mínimo 2 adicionales)</label>
              <div id="groupMembersList"
                style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                <?php

                $conexion = new mysqli($server, $user, $pass, $bd);
                $usuarios_grupo_query = $conexion->prepare("
                                SELECT id, nombre, email 
                                FROM usuario 
                                WHERE id != ?
                                ORDER BY nombre
                            ");
                $usuarios_grupo_query->bind_param("i", $usuario_actual_id);
                $usuarios_grupo_query->execute();
                $usuarios_grupo_result = $usuarios_grupo_query->get_result();

                while ($usuario = $usuarios_grupo_result->fetch_assoc()) {
                  echo '<div class="form-check">';
                  echo '<input class="form-check-input group-member-checkbox" type="checkbox" 
                                       value="' . $usuario['id'] . '" id="user_' . $usuario['id'] . '">';
                  echo '<label class="form-check-label" for="user_' . $usuario['id'] . '">';
                  echo htmlspecialchars($usuario['nombre']) . ' (' . htmlspecialchars($usuario['email']) . ')';
                  echo '</label>';
                  echo '</div>';
                }
                $usuarios_grupo_query->close();
                $conexion->close();
                ?>
              </div>
              <small class="text-muted" id="memberCountText">Seleccionados: 0</small>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-primary" id="confirmCreateGroup" disabled>Crear Grupo</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-content">
      <div class="copyright">© 2026 App Social del Mundial</div>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"
    integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM"
    crossorigin="anonymous"></script>

  <script src="../js/inicio.js" defer></script>
</body>

</html>

<?php
function getIniciales($nombre)
{
  $palabras = explode(' ', $nombre);
  $iniciales = '';
  foreach ($palabras as $palabra) {
    if (!empty($palabra)) {
      $iniciales .= strtoupper($palabra[0]);
    }
  }
  return substr($iniciales, 0, 2);
}
?>