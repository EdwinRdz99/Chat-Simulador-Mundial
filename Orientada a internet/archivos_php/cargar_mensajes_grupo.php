<?php
session_start();
include("configuracion.php");

if (!isset($_SESSION['usuario_id'])) {
    die("No autorizado");
}

$usuario_actual_id = $_SESSION['usuario_id'];
$grupo_id = $_GET['grupo_id'] ?? 0;

if (!$grupo_id) {
    die("ID de grupo no válido");
}

$conexion = new mysqli($server, $user, $pass, $bd);


$query_verificar = $conexion->prepare("
    SELECT 1 FROM grupo_usuarios 
    WHERE grupo_id = ? AND usuario_id = ?
");
$query_verificar->bind_param("ii", $grupo_id, $usuario_actual_id);
$query_verificar->execute();
$query_verificar->store_result();

if ($query_verificar->num_rows === 0) {
    die("No perteneces a este grupo");
}
$query_verificar->close();


$query = $conexion->prepare("
    SELECT mg.*, u.nombre as remitente_nombre 
    FROM mensajes_grupo mg 
    JOIN usuario u ON mg.remitente_id = u.id 
    WHERE mg.grupo_id = ? 
    ORDER BY mg.fecha_envio ASC
");
$query->bind_param("i", $grupo_id);
$query->execute();
$result = $query->get_result();

function formatBytes($bytes, $decimals = 2)
{
    if ($bytes == 0)
        return '0 Bytes';

    $k = 1024;
    $dm = $decimals < 0 ? 0 : $decimals;
    $sizes = ['Bytes', 'KB', 'MB', 'GB'];

    $i = floor(log($bytes) / log($k));

    return number_format($bytes / pow($k, $i), $dm) . ' ' . $sizes[$i];
}

function obtenerIconoArchivo($tipo, $nombre)
{
    if (!$nombre)
        return 'fa-file';

    if ($tipo) {
        if (strpos($tipo, 'image/') === 0)
            return 'fa-file-image';
        if (strpos($tipo, 'video/') === 0)
            return 'fa-file-video';
        if (strpos($tipo, 'audio/') === 0)
            return 'fa-file-audio';
        if (strpos($tipo, 'pdf') !== false)
            return 'fa-file-pdf';
        if (strpos($tipo, 'word') !== false || strpos($tipo, 'document') !== false)
            return 'fa-file-word';
        if (strpos($tipo, 'excel') !== false || strpos($tipo, 'spreadsheet') !== false)
            return 'fa-file-excel';
        if (strpos($tipo, 'zip') !== false || strpos($tipo, 'compressed') !== false)
            return 'fa-file-archive';
    }

    return 'fa-file';
}


while ($mensaje = $result->fetch_assoc()) {
    $clase = $mensaje['remitente_id'] == $usuario_actual_id ? 'sent' : 'received';
    $hora = date('H:i', strtotime($mensaje['fecha_envio']));


    $nombre_remitente = '';
    if ($mensaje['remitente_id'] != $usuario_actual_id) {
        $nombre_remitente = '<div class="message-sender">' . htmlspecialchars($mensaje['remitente_nombre']) . '</div>';
    }

    switch ($mensaje['tipo_mensaje']) {
        case 'ubicacion':
    
            $googleMapsUrl = "https://www.google.com/maps?q={$mensaje['ubicacion_lat']},{$mensaje['ubicacion_lng']}&z=15";
            $mapIframeUrl = "https://www.openstreetmap.org/export/embed.html?bbox=" .
                ($mensaje['ubicacion_lng'] - 0.01) . "," .
                ($mensaje['ubicacion_lat'] - 0.01) . "," .
                ($mensaje['ubicacion_lng'] + 0.01) . "," .
                ($mensaje['ubicacion_lat'] + 0.01) .
                "&marker={$mensaje['ubicacion_lat']},{$mensaje['ubicacion_lng']}";

            echo '<div class="message ' . $clase . '">';
            echo $nombre_remitente;
            echo '<div class="message-location">';
            echo '<div class="location-map">';
            echo '<iframe width="100%" height="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="' . $mapIframeUrl . '" title="Ubicación compartida"></iframe>';
            echo '</div>';
            echo '<div class="location-info">';
            echo '<div class="location-name">' . htmlspecialchars($mensaje['ubicacion_nombre']) . '</div>';
            echo '<a href="' . $googleMapsUrl . '" target="_blank" class="view-map-btn">';
            echo '<i class="fas fa-external-link-alt"></i> Abrir en Google Maps';
            echo '</a>';
            echo '<div class="message-time">' . $hora . '</div>';
            echo '</div>';
            echo '</div>';
            echo '</div>';
            break;

        case 'archivo':
          
            $esImagen = $mensaje['archivoTipo'] && strpos($mensaje['archivoTipo'], 'image/') === 0;
            $tamañoFormateado = $mensaje['archivoSize'] ? formatBytes($mensaje['archivoSize']) : 'Tamaño desconocido';
            $nombreArchivo = $mensaje['archivoNombre'] ?: 'archivo';
            $rutaArchivo = htmlspecialchars($mensaje['archivoPath'] ?: '#');

            echo '<div class="message ' . $clase . '">';
            echo $nombre_remitente;
            echo '<div class="message-file">';

            if ($esImagen) {
                echo '<div class="file-preview image-preview">';
                echo '<img src="' . $rutaArchivo . '" alt="' . htmlspecialchars($nombreArchivo) . '" onclick="ampliarImagen(\'' . $rutaArchivo . '\')">';
                echo '</div>';
            } else {
                $icono = obtenerIconoArchivo($mensaje['archivoTipo'], $nombreArchivo);
                echo '<div class="file-preview">';
                echo '<i class="fas ' . $icono . ' fa-2x"></i>';
                echo '</div>';
            }

            echo '<div class="file-info">';
            echo '<div class="file-name">' . htmlspecialchars($nombreArchivo) . '</div>';
            echo '<div class="file-size">' . $tamañoFormateado . '</div>';
            echo '<a href="' . $rutaArchivo . '" download="' . htmlspecialchars($nombreArchivo) . '" class="download-btn">';
            echo '<i class="fas fa-download"></i> Descargar';
            echo '</a>';
            echo '<div class="message-time">' . $hora . '</div>';
            echo '</div>';
            echo '</div>';
            echo '</div>';
            break;

        case 'lista_tareas':

            echo '<div class="message ' . $clase . '">';
            echo $nombre_remitente;
            echo '<div class="message-tasks">';
            echo '<div class="tasks-header">';
            echo '<i class="fas fa-tasks me-2"></i>';
            echo '<strong>' . htmlspecialchars($mensaje['mensaje']) . '</strong>';
            echo '</div>';
            echo '<div class="tasks-list">';

           
            $tareas_query = $conexion->prepare("
        SELECT lt.id, lt.tarea_texto, lt.completada,
               EXISTS(SELECT 1 FROM tareas_completadas WHERE tarea_id = lt.id AND usuario_id = ?) as ya_completada
        FROM lista_tareas lt 
        WHERE lt.mensaje_grupo_id = ?
        ORDER BY lt.id
    ");
            $tareas_query->bind_param("ii", $usuario_actual_id, $mensaje['id']);
            $tareas_query->execute();
            $tareas_result = $tareas_query->get_result();

            while ($tarea = $tareas_result->fetch_assoc()) {
                $tarea_id = $tarea['id'];
                $completada = $tarea['completada'];
                $ya_completada = $tarea['ya_completada'];
                $disabled = $completada || $ya_completada ? 'disabled' : '';
                $checked = $completada || $ya_completada ? 'checked' : '';

                echo '<div class="task-item ' . ($completada ? 'task-completed' : '') . '">';
                echo '<div class="form-check">';
                echo '<input class="form-check-input task-checkbox" type="checkbox" 
              data-tarea-id="' . $tarea_id . '" ' . $checked . ' ' . $disabled . '>';
                echo '<label class="form-check-label">' . htmlspecialchars($tarea['tarea_texto']) . '</label>';
                echo '</div>';
                echo '</div>';
            }

            $tareas_query->close();
            echo '</div>';
            echo '<div class="message-time">' . $hora . '</div>';
            echo '</div>';
            echo '</div>';
            break;

        default:
        
            echo '<div class="message ' . $clase . '">';
            echo $nombre_remitente;
            echo '<div class="message-text">' . htmlspecialchars($mensaje['mensaje']) . '</div>';
            echo '<div class="message-time">' . $hora . '</div>';
            echo '</div>';
            break;
    }
}

$query->close();
$conexion->close();
?>