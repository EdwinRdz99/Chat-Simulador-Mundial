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
$equipo_seleccionado = $_POST['equipo_seleccionado'];


$ranking_poder = [
    'Argentina' => 95,
    'Brasil' => 92,
    'Africa' => 88,
    'Colombia' => 85,
    'Mexico' => 83,
    'Uruguay' => 82,
    'USA' => 80,
    'Japon' => 78,
    'Iran' => 76,
    'Corea' => 75,
    'Ecuador' => 74,
    'Australia' => 72,
    'Canada' => 70,
    'Paraguay' => 68,
    'Uzbekistan' => 65,
    'NZ' => 63,
    'Jordan' => 60
];


function simularPartido($equipoA, $equipoB, $ranking_poder) {
    $poderA = $ranking_poder[$equipoA];
    $poderB = $ranking_poder[$equipoB];
    
    
    $golesA = round(rand(0, $poderA) / 30);
    $golesB = round(rand(0, $poderB) / 30);
    
    return [
        'equipoA' => $equipoA,
        'equipoB' => $equipoB,
        'golesA' => $golesA,
        'golesB' => $golesB,
        'ganador' => $golesA > $golesB ? $equipoA : ($golesB > $golesA ? $equipoB : null)
    ];
}


function simularPartidoEliminacion($equipoA, $equipoB, $ranking_poder) {
    $partido = simularPartido($equipoA, $equipoB, $ranking_poder);
    
    
    if ($partido['ganador'] === null) {
        $probabilidadA = $ranking_poder[$equipoA] / ($ranking_poder[$equipoA] + $ranking_poder[$equipoB]);
        $partido['ganador'] = (rand(0, 100) / 100) <= $probabilidadA ? $equipoA : $equipoB;
        $partido['penales'] = true;
    }
    
    return $partido;
}


$grupos = [
    'Grupo A' => ['Argentina', 'USA', 'Ecuador', 'Uzbekistan'],
    'Grupo B' => ['Brasil', 'Japon', 'Australia', 'NZ'],
    'Grupo C' => ['Africa', 'Iran', 'Canada', 'Jordan'],
    'Grupo D' => ['Colombia', 'Mexico', 'Uruguay', 'Corea', 'Paraguay']
];

$resultados_grupos = [];
$clasificados = [];

foreach ($grupos as $nombre_grupo => $equipos_grupo) {
    $partidos_grupo = [];
    $tabla_posiciones = [];
    
    
    foreach ($equipos_grupo as $equipo) {
        $tabla_posiciones[$equipo] = [
            'pj' => 0, 'pg' => 0, 'pe' => 0, 'pp' => 0, 
            'gf' => 0, 'gc' => 0, 'pts' => 0
        ];
    }
    
    
    for ($i = 0; $i < count($equipos_grupo); $i++) {
        for ($j = $i + 1; $j < count($equipos_grupo); $j++) {
            $partido = simularPartido($equipos_grupo[$i], $equipos_grupo[$j], $ranking_poder);
            $partidos_grupo[] = $partido;
            
            
            $tabla_posiciones[$equipos_grupo[$i]]['pj']++;
            $tabla_posiciones[$equipos_grupo[$j]]['pj']++;
            
            $tabla_posiciones[$equipos_grupo[$i]]['gf'] += $partido['golesA'];
            $tabla_posiciones[$equipos_grupo[$i]]['gc'] += $partido['golesB'];
            $tabla_posiciones[$equipos_grupo[$j]]['gf'] += $partido['golesB'];
            $tabla_posiciones[$equipos_grupo[$j]]['gc'] += $partido['golesA'];
            
            if ($partido['ganador'] === $equipos_grupo[$i]) {
                $tabla_posiciones[$equipos_grupo[$i]]['pg']++;
                $tabla_posiciones[$equipos_grupo[$i]]['pts'] += 3;
                $tabla_posiciones[$equipos_grupo[$j]]['pp']++;
            } elseif ($partido['ganador'] === $equipos_grupo[$j]) {
                $tabla_posiciones[$equipos_grupo[$j]]['pg']++;
                $tabla_posiciones[$equipos_grupo[$j]]['pts'] += 3;
                $tabla_posiciones[$equipos_grupo[$i]]['pp']++;
            } else {
                $tabla_posiciones[$equipos_grupo[$i]]['pe']++;
                $tabla_posiciones[$equipos_grupo[$i]]['pts'] += 1;
                $tabla_posiciones[$equipos_grupo[$j]]['pe']++;
                $tabla_posiciones[$equipos_grupo[$j]]['pts'] += 1;
            }
        }
    }
    
    
    uasort($tabla_posiciones, function($a, $b) {
        if ($a['pts'] != $b['pts']) return $b['pts'] - $a['pts'];
        return ($b['gf'] - $b['gc']) - ($a['gf'] - $a['gc']);
    });
    
    
    $clasificados_grupo = array_slice(array_keys($tabla_posiciones), 0, 2);
    $clasificados = array_merge($clasificados, $clasificados_grupo);
    
    $resultados_grupos[$nombre_grupo] = [
        'partidos' => $partidos_grupo,
        'tabla' => $tabla_posiciones,
        'clasificados' => $clasificados_grupo
    ];
}


$fase_eliminacion = [
    'Octavos' => [],
    'Cuartos' => [],
    'Semifinales' => [],
    'Final' => []
];


$octavos = array_chunk($clasificados, 2);
foreach ($octavos as $partido_octavos) {
    if (count($partido_octavos) == 2) {
        $partido = simularPartidoEliminacion($partido_octavos[0], $partido_octavos[1], $ranking_poder);
        $fase_eliminacion['Octavos'][] = $partido;
        $ganadores_cuartos[] = $partido['ganador'];
    }
}


$cuartos = array_chunk($ganadores_cuartos, 2);
foreach ($cuartos as $partido_cuartos) {
    if (count($partido_cuartos) == 2) {
        $partido = simularPartidoEliminacion($partido_cuartos[0], $partido_cuartos[1], $ranking_poder);
        $fase_eliminacion['Cuartos'][] = $partido;
        $ganadores_semifinales[] = $partido['ganador'];
    }
}


$semifinales = array_chunk($ganadores_semifinales, 2);
foreach ($semifinales as $partido_semifinal) {
    if (count($partido_semifinal) == 2) {
        $partido = simularPartidoEliminacion($partido_semifinal[0], $partido_semifinal[1], $ranking_poder);
        $fase_eliminacion['Semifinales'][] = $partido;
        $ganadores_final[] = $partido['ganador'];
        
        $perdedor_final = $partido['ganador'] == $partido_semifinal[0] ? $partido_semifinal[1] : $partido_semifinal[0];
        $tercer_lugar[] = $perdedor_final;
    }
}


if (count($tercer_lugar) == 2) {
    $partido_tercer_lugar = simularPartidoEliminacion($tercer_lugar[0], $tercer_lugar[1], $ranking_poder);
    $fase_eliminacion['TercerLugar'] = $partido_tercer_lugar;
}


if (count($ganadores_final) == 2) {
    $partido_final = simularPartidoEliminacion($ganadores_final[0], $ganadores_final[1], $ranking_poder);
    $fase_eliminacion['Final'] = $partido_final;
    
    $campeon = $partido_final['ganador'];
    $subcampeon = $partido_final['ganador'] == $ganadores_final[0] ? $ganadores_final[1] : $ganadores_final[0];
} else {
    $campeon = $ganadores_final[0] ?? 'Desconocido';
    $subcampeon = 'Desconocido';
}


$puntos_obtenidos = 0;
if ($campeon === $equipo_seleccionado) {
    $puntos_obtenidos = 3;
} else {
    $puntos_obtenidos = 1;
}


$conexion = new mysqli($server, $user, $pass, $bd);


$puntos_query = $conexion->prepare("SELECT puntos FROM usuario_nivel WHERE usuario_id = ?");
$puntos_query->bind_param("i", $usuario_actual_id);
$puntos_query->execute();
$puntos_result = $puntos_query->get_result();

if ($puntos_result->num_rows > 0) {
    $puntos_data = $puntos_result->fetch_assoc();
    $nuevos_puntos = $puntos_data['puntos'] + $puntos_obtenidos;
    
    
    $update_puntos = $conexion->prepare("UPDATE usuario_nivel SET puntos = ? WHERE usuario_id = ?");
    $update_puntos->bind_param("ii", $nuevos_puntos, $usuario_actual_id);
    $update_puntos->execute();
    $update_puntos->close();
    
    
    $nivel_query = $conexion->prepare("
        SELECT n.nombre 
        FROM nivel n 
        WHERE n.puntos_requeridos <= ? 
        ORDER BY n.puntos_requeridos DESC 
        LIMIT 1
    ");
    $nivel_query->bind_param("i", $nuevos_puntos);
    $nivel_query->execute();
    $nivel_result = $nivel_query->get_result();
    
    $nuevo_nivel = "Novato";
    if ($nivel_result->num_rows > 0) {
        $nivel_data = $nivel_result->fetch_assoc();
        $nuevo_nivel = $nivel_data['nombre'];
    }
    $nivel_query->close();
} else {
    
    $insert_nivel = $conexion->prepare("INSERT INTO usuario_nivel (usuario_id, nivel_id, puntos) VALUES (?, 1, ?)");
    $insert_nivel->bind_param("ii", $usuario_actual_id, $puntos_obtenidos);
    $insert_nivel->execute();
    $insert_nivel->close();
    $nuevo_nivel = "Novato";
    $nuevos_puntos = $puntos_obtenidos;
}

$puntos_query->close();
$conexion->close();


echo json_encode([
    'success' => true,
    'campeon' => $campeon,
    'subcampeon' => $subcampeon,
    'equipo_seleccionado' => $equipo_seleccionado,
    'puntos_obtenidos' => $puntos_obtenidos,
    'nuevos_puntos' => $nuevos_puntos,
    'nuevo_nivel' => $nuevo_nivel,
    'fase_grupos' => $resultados_grupos,
    'fase_eliminacion' => $fase_eliminacion
]);
?>