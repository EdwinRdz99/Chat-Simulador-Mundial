<?php
session_start();
include("configuracion.php");

if (!isset($_SESSION['usuario_id'])) {
    die("No autorizado");
}

$usuario_actual_id = $_SESSION['usuario_id'];
$destinatario_id = $_GET['destinatario_id'];

$conexion = new mysqli($server, $user, $pass, $bd);

$query = $conexion->prepare("
    SELECT m.*, u.nombre as remitente_nombre 
    FROM mensajes m 
    JOIN usuario u ON m.remitente_id = u.id 
    WHERE (m.remitente_id = ? AND m.destinatario_id = ?) 
       OR (m.remitente_id = ? AND m.destinatario_id = ?) 
    ORDER BY m.fecha_envio ASC
");
$query->bind_param("iiii", $usuario_actual_id, $destinatario_id, $destinatario_id, $usuario_actual_id);
$query->execute();
$result = $query->get_result();

function formatBytes($bytes, $decimals = 2) {
    if ($bytes == 0) return '0 Bytes';
    
    $k = 1024;
    $dm = $decimals < 0 ? 0 : $decimals;
    $sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    $i = floor(log($bytes) / log($k));
    
    return number_format($bytes / pow($k, $i), $dm) . ' ' . $sizes[$i];
}

function obtenerIconoArchivo($tipo, $nombre) {
    if (!$nombre) return 'fa-file';
    
    if ($tipo) {
        if (strpos($tipo, 'image/') === 0) return 'fa-file-image';
        if (strpos($tipo, 'video/') === 0) return 'fa-file-video';
        if (strpos($tipo, 'audio/') === 0) return 'fa-file-audio';
        if (strpos($tipo, 'pdf') !== false) return 'fa-file-pdf';
        if (strpos($tipo, 'word') !== false || strpos($tipo, 'document') !== false) return 'fa-file-word';
        if (strpos($tipo, 'excel') !== false || strpos($tipo, 'spreadsheet') !== false) return 'fa-file-excel';
        if (strpos($tipo, 'zip') !== false || strpos($tipo, 'compressed') !== false) return 'fa-file-archive';
    }
    
    $partes = explode('.', $nombre);
    if (count($partes) > 1) {
        $extension = strtolower(end($partes));
        $extensiones_imagen = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        $extensiones_video = ['mp4', 'avi', 'mov', 'wmv', 'mkv'];
        $extensiones_audio = ['mp3', 'wav', 'ogg', 'flac'];
        
        if (in_array($extension, ['doc', 'docx'])) return 'fa-file-word';
        if (in_array($extension, ['xls', 'xlsx'])) return 'fa-file-excel';
        if ($extension == 'pdf') return 'fa-file-pdf';
        if (in_array($extension, ['zip', 'rar', '7z'])) return 'fa-file-archive';
        if (in_array($extension, $extensiones_imagen)) return 'fa-file-image';
        if (in_array($extension, $extensiones_video)) return 'fa-file-video';
        if (in_array($extension, $extensiones_audio)) return 'fa-file-audio';
    }
    
    return 'fa-file';
}


while ($mensaje = $result->fetch_assoc()) {
    $clase = $mensaje['remitente_id'] == $usuario_actual_id ? 'sent' : 'received';
    $hora = date('H:i', strtotime($mensaje['fecha_envio']));

    
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

        default:
            
            echo '<div class="message ' . $clase . '">';
            echo '<div class="message-text">' . htmlspecialchars($mensaje['mensaje']) . '</div>';
            echo '<div class="message-time">' . $hora . '</div>';
            echo '</div>';
            break;
    }
}

$query->close();
$conexion->close();
?>