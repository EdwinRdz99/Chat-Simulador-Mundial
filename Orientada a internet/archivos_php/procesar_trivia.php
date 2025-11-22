<?php
session_start();
include("configuracion.php");

if (!isset($_SESSION['usuario_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit();
}

$usuario_actual_id = $_SESSION['usuario_id'];
$trivia_id = $_POST['trivia_id'];
$respuesta = $_POST['respuesta'];
$correcta = $_POST['correcta'] == 1;

$conexion = new mysqli($server, $user, $pass, $bd);


$trivia_check = $conexion->prepare("
    SELECT * FROM trivia 
    WHERE id = ? AND fecha = CURDATE() AND activa = TRUE
");
$trivia_check->bind_param("i", $trivia_id);
$trivia_check->execute();
$trivia_result = $trivia_check->get_result();

if ($trivia_result->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'Trivia no válida']);
    exit();
}


$respuesta_check = $conexion->prepare("
    SELECT * FROM trivia_respuesta 
    WHERE usuario_id = ? AND trivia_id = ?
");
$respuesta_check->bind_param("ii", $usuario_actual_id, $trivia_id);
$respuesta_check->execute();
$respuesta_result = $respuesta_check->get_result();

if ($respuesta_result->num_rows > 0) {
    echo json_encode(['success' => false, 'error' => 'Ya respondiste esta trivia']);
    exit();
}


$insert_respuesta = $conexion->prepare("
    INSERT INTO trivia_respuesta (usuario_id, trivia_id, respuesta, correcta)
    VALUES (?, ?, ?, ?)
");
$insert_respuesta->bind_param("iiii", $usuario_actual_id, $trivia_id, $respuesta, $correcta);
$insert_respuesta->execute();

$nuevos_puntos = 0;
$nuevo_nivel = '';


if ($correcta) {
    otorgarPuntos($conexion, $usuario_actual_id);
    
   
    $puntos_query = $conexion->prepare("
        SELECT un.puntos, n.nombre 
        FROM usuario_nivel un 
        JOIN nivel n ON un.nivel_id = n.id 
        WHERE un.usuario_id = ?
    ");
    $puntos_query->bind_param("i", $usuario_actual_id);
    $puntos_query->execute();
    $puntos_result = $puntos_query->get_result();
    
    if ($puntos_data = $puntos_result->fetch_assoc()) {
        $nuevos_puntos = $puntos_data['puntos'];
        $nuevo_nivel = $puntos_data['nombre'];
    }
    $puntos_query->close();
}

echo json_encode([
    'success' => true,
    'puntos_otorgados' => $correcta ? 5 : 0,
    'nuevos_puntos' => $nuevos_puntos,
    'nuevo_nivel' => $nuevo_nivel
]);

$conexion->close();

function otorgarPuntos($conexion, $usuario_id) {
 
    $nivel_query = $conexion->prepare("
        SELECT puntos, nivel_id 
        FROM usuario_nivel 
        WHERE usuario_id = ?
    ");
    $nivel_query->bind_param("i", $usuario_id);
    $nivel_query->execute();
    $nivel_result = $nivel_query->get_result();
    
    if ($nivel_data = $nivel_result->fetch_assoc()) {
        $nuevos_puntos = $nivel_data['puntos'] + 5;
        $nivel_actual = $nivel_data['nivel_id'];
        
       
        $siguiente_nivel_query = $conexion->prepare("
            SELECT id, puntos_requeridos 
            FROM nivel 
            WHERE puntos_requeridos <= ? 
            ORDER BY puntos_requeridos DESC 
            LIMIT 1
        ");
        $siguiente_nivel_query->bind_param("i", $nuevos_puntos);
        $siguiente_nivel_query->execute();
        $siguiente_nivel_result = $siguiente_nivel_query->get_result();
        
        $nuevo_nivel_id = $nivel_actual;
        if ($siguiente_nivel_result->num_rows > 0) {
            $siguiente_nivel = $siguiente_nivel_result->fetch_assoc();
            $nuevo_nivel_id = $siguiente_nivel['id'];
        }
        
      
        $update_nivel = $conexion->prepare("
            UPDATE usuario_nivel 
            SET puntos = ?, nivel_id = ? 
            WHERE usuario_id = ?
        ");
        $update_nivel->bind_param("iii", $nuevos_puntos, $nuevo_nivel_id, $usuario_id);
        $update_nivel->execute();
        $update_nivel->close();
    }
    $nivel_query->close();
}
?>