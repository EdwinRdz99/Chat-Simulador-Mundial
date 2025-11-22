<?php
session_start();
include("configuracion.php");


header('Content-Type: application/json');


error_log("Datos POST recibidos: " . print_r($_POST, true));

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    die(json_encode(['success' => false, 'error' => 'No autorizado']));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['success' => false, 'error' => 'Método no permitido']));
}

$usuario_actual_id = $_SESSION['usuario_id'];
$nombre_grupo = trim($_POST['nombre_grupo'] ?? '');
$miembros_ids = $_POST['miembros_ids'] ?? [];


error_log("Nombre grupo: $nombre_grupo");
error_log("Miembros IDs: " . print_r($miembros_ids, true));
error_log("Cantidad de miembros: " . count($miembros_ids));


if (empty($nombre_grupo)) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'El nombre del grupo es requerido']));
}

if (count($miembros_ids) < 2) {
    http_response_code(400);
    die(json_encode([
        'success' => false,
        'error' => 'Se requieren al menos 2 miembros adicionales. Seleccionados: ' . count($miembros_ids),
        'debug' => $miembros_ids
    ]));
}

$conexion = new mysqli($server, $user, $pass, $bd);

if ($conexion->connect_error) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'Error de conexión a la base de datos']));
}

try {
  
    $conexion->begin_transaction();

   
    $query_grupo = $conexion->prepare("INSERT INTO grupos (nombre, creador_id) VALUES (?, ?)");
    if (!$query_grupo) {
        throw new Exception("Error al preparar consulta: " . $conexion->error);
    }

    $query_grupo->bind_param("si", $nombre_grupo, $usuario_actual_id);

    if (!$query_grupo->execute()) {
        throw new Exception("Error al crear el grupo: " . $query_grupo->error);
    }

    $grupo_id = $conexion->insert_id;
    $query_grupo->close();

  
    $query_miembro = $conexion->prepare("INSERT INTO grupo_usuarios (grupo_id, usuario_id) VALUES (?, ?)");
    if (!$query_miembro) {
        throw new Exception("Error al preparar consulta: " . $conexion->error);
    }

    $query_miembro->bind_param("ii", $grupo_id, $usuario_actual_id);

    if (!$query_miembro->execute()) {
        throw new Exception("Error al agregar creador al grupo: " . $query_miembro->error);
    }

    foreach ($miembros_ids as $miembro_id) {
        $miembro_id = intval($miembro_id);
        if ($miembro_id !== $usuario_actual_id) {
            $query_miembro->bind_param("ii", $grupo_id, $miembro_id);
            if (!$query_miembro->execute()) {
                throw new Exception("Error al agregar miembro al grupo: " . $query_miembro->error);
            }
        }
    }

    $query_miembro->close();

    $mensaje_bienvenida = "Grupo '" . $nombre_grupo . "' creado por " . $_SESSION['usuario_nombre'];
    $query_mensaje = $conexion->prepare("INSERT INTO mensajes_grupo (grupo_id, remitente_id, mensaje) VALUES (?, ?, ?)");
    if (!$query_mensaje) {
        throw new Exception("Error al preparar consulta: " . $conexion->error);
    }

    $query_mensaje->bind_param("iis", $grupo_id, $usuario_actual_id, $mensaje_bienvenida);

    if (!$query_mensaje->execute()) {
        throw new Exception("Error al crear mensaje de bienvenida: " . $query_mensaje->error);
    }

    $query_mensaje->close();

  
    $conexion->commit();

    echo json_encode([
        'success' => true,
        'grupo_id' => $grupo_id,
        'message' => 'Grupo creado exitosamente'
    ]);

} catch (Exception $e) {
    
    $conexion->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    $conexion->close();
}
?>