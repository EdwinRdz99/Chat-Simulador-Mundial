<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

if (!isset($_FILES['archivo']) || !isset($_POST['usuario_id'])) {
    echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
    exit;
}

$usuario_id = intval($_POST['usuario_id']);
$archivo = $_FILES['archivo'];

// Validar que sea un archivo válido
if ($archivo['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'Error en la subida del archivo']);
    exit;
}

// Validar tamaño (10MB máximo)
if ($archivo['size'] > 10 * 1024 * 1024) {
    echo json_encode(['success' => false, 'error' => 'El archivo es demasiado grande. Máximo 10MB']);
    exit;
}

// Crear directorio de uploads si no existe
$uploadDir = '../Archivos/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Generar nombre único para el archivo
$extension = pathinfo($archivo['name'], PATHINFO_EXTENSION);
$nombreUnico = uniqid() . '_' . time() . '.' . $extension;
$rutaCompleta = $uploadDir . $nombreUnico;

// Mover el archivo
if (move_uploaded_file($archivo['tmp_name'], $rutaCompleta)) {
    echo json_encode([
        'success' => true,
        'ruta' => '../Archivos/' . $nombreUnico,
        'nombre' => $archivo['name'],
        'tipo' => $archivo['type'],
        'tamaño' => $archivo['size']
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Error al guardar el archivo']);
}
?>