<?php
session_start();
include("configuracion.php");

if (!isset($_SESSION['usuario_id'])) {
    header("Location: login.php");
    exit();
}

$usuario_actual_id = $_SESSION['usuario_id'];

$conexion = new mysqli($server, $user, $pass, $bd);


$trivia_query = $conexion->prepare("
    SELECT t.* 
    FROM trivia t 
    WHERE t.fecha = CURDATE() AND t.activa = TRUE
    LIMIT 1
");
$trivia_query->execute();
$trivia_result = $trivia_query->get_result();

if ($trivia_result->num_rows === 0) {
    $no_trivia = true;
} else {
    $trivia = $trivia_result->fetch_assoc();
    $no_trivia = false;
    

    $respuesta_query = $conexion->prepare("
        SELECT * FROM trivia_respuesta 
        WHERE usuario_id = ? AND trivia_id = ?
        LIMIT 1
    ");
    $respuesta_query->bind_param("ii", $usuario_actual_id, $trivia['id']);
    $respuesta_query->execute();
    $respuesta_result = $respuesta_query->get_result();
    
    $ya_respondio = $respuesta_result->num_rows > 0;
    
 
    $ya_respondio_correcta = false;
    if ($ya_respondio) {
        $respuesta_data = $respuesta_result->fetch_assoc();
        $ya_respondio_correcta = $respuesta_data['correcta'] == 1;
    }
    $respuesta_query->close();
    
    
    $nivel_query = $conexion->prepare("
        SELECT un.puntos, un.nivel_id, n.nombre as nivel_nombre, n.puntos_requeridos
        FROM usuario_nivel un 
        JOIN nivel n ON un.nivel_id = n.id 
        WHERE un.usuario_id = ?
    ");
    $nivel_query->bind_param("i", $usuario_actual_id);
    $nivel_query->execute();
    $nivel_result = $nivel_query->get_result();
    
    if ($nivel_result->num_rows === 0) {
        
        $insert_nivel = $conexion->prepare("
            INSERT INTO usuario_nivel (usuario_id, nivel_id, puntos) 
            VALUES (?, 1, 0)
        ");
        $insert_nivel->bind_param("i", $usuario_actual_id);
        $insert_nivel->execute();
        $insert_nivel->close();
        
        $puntos = 0;
        $nivel_actual = "Novato";
        $nivel_id = 1;
    } else {
        $nivel_data = $nivel_result->fetch_assoc();
        $puntos = $nivel_data['puntos'];
        $nivel_actual = $nivel_data['nivel_nombre'];
        $nivel_id = $nivel_data['nivel_id'];
    }
    $nivel_query->close();
}

$conexion->close();
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Trivia Mundial 2026</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <link rel="stylesheet" href="../css/trivia.css" />
</head>
<body>
    <header class="header">
        <div class="logo">TRIVIA MUNDIAL 2026</div>
        <div class="user-actions">
            <button class="btn btn-primary" id="backBtn">Regresar al Inicio</button>
        </div>
    </header>

    <div class="main-container">
        <div class="trivia-area">
            <div class="trivia-header">
                <h2>Trivia del Día</h2>
                <div class="trivia-score">
                    Nivel: <span id="nivel"><?php echo htmlspecialchars($nivel_actual); ?></span> | 
                    Puntos: <span id="score"><?php echo $puntos; ?></span>
                </div>
            </div>

            <?php if ($no_trivia): ?>
                <div class="trivia-card">
                    <div class="trivia-question">No hay trivia disponible para hoy.</div>
                    <div class="trivia-footer">
                        <p>Vuelve mañana para una nueva pregunta.</p>
                    </div>
                </div>
            <?php elseif ($ya_respondio): ?>
                <div class="trivia-card">
                    <div class="trivia-question">Ya respondiste la trivia de hoy.</div>
                    <div class="trivia-footer">
                        <p>
                            <?php 
                            if ($ya_respondio_correcta) {
                                echo "¡Correcto! Ganaste 5 puntos.";
                            } else {
                                echo "Respuesta incorrecta. Vuelve a intentarlo mañana.";
                            }
                            ?>
                        </p>
                    </div>
                </div>
            <?php else: ?>
                <div class="trivia-card">
                    <div class="trivia-question" id="question"><?php echo htmlspecialchars($trivia['pregunta']); ?></div>

                    <div class="trivia-options" id="options">
                        <?php
                        $opciones = [
                            $trivia['opcion1'],
                            $trivia['opcion2'], 
                            $trivia['opcion3'],
                            $trivia['opcion4']
                        ];
                        
                        foreach ($opciones as $index => $opcion) {
                            echo '<button class="option-btn" data-index="' . $index . '">' . htmlspecialchars($opcion) . '</button>';
                        }
                        ?>
                    </div>

                    <div class="trivia-feedback" id="feedback"></div>
                </div>
            <?php endif; ?>

            <div class="trivia-footer">
                <p>Responde correctamente para ganar 5 puntos diarios.</p>
            </div>
        </div>
    </div>

    <footer class="footer">
        <div class="footer-content">
            <div class="copyright">© 2026 App Social del Mundial</div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function () {
          
            document.getElementById("backBtn").addEventListener("click", () => {
                window.location.href = "inicio.php";
            });

            <?php if (!$no_trivia && !$ya_respondio): ?>
           
            const optionButtons = document.querySelectorAll('.option-btn');
            const feedbackElement = document.getElementById('feedback');
            let answered = false;

            optionButtons.forEach(button => {
                button.addEventListener('click', function() {
                    if (answered) return;
                    
                    answered = true;
                    const selectedIndex = parseInt(this.getAttribute('data-index'));
                    const correctAnswer = <?php echo $trivia['respuesta_correcta']; ?>;
                    
                   
                    optionButtons.forEach(btn => {
                        btn.classList.add('disabled');
                    });
                    
                    
                    optionButtons[correctAnswer].classList.add('correct');
                    if (selectedIndex !== correctAnswer) {
                        this.classList.add('incorrect');
                    }
                    
                    
                    enviarRespuesta(selectedIndex, selectedIndex === correctAnswer);
                });
            });

            function enviarRespuesta(respuestaIndex, esCorrecta) {
                const formData = new FormData();
                formData.append('trivia_id', <?php echo $trivia['id']; ?>);
                formData.append('respuesta', respuestaIndex);
                formData.append('correcta', esCorrecta ? 1 : 0);

                fetch('procesar_trivia.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (esCorrecta) {
                            feedbackElement.textContent = "¡Correcto! Ganaste " + data.puntos_otorgados + " puntos.";
                            feedbackElement.classList.add('feedback-correct');
                            
                            document.getElementById('score').textContent = data.nuevos_puntos;
                            document.getElementById('nivel').textContent = data.nuevo_nivel;
                        } else {
                            feedbackElement.textContent = "Respuesta incorrecta. Mejor suerte mañana.";
                            feedbackElement.classList.add('feedback-incorrect');
                        }
                        
                       
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    } else {
                        feedbackElement.textContent = "Error: " + data.error;
                        feedbackElement.classList.add('feedback-incorrect');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    feedbackElement.textContent = "Error al procesar la respuesta";
                    feedbackElement.classList.add('feedback-incorrect');
                });
            }
            <?php endif; ?>
        });
    </script>
</body>
</html>