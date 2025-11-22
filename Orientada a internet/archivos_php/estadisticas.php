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


$usuarios_query = $conexion->prepare("
    SELECT 
        u.id,
        u.nombre,
        u.email,
        u.fecha_registro,
        COALESCE(un.puntos, 0) as puntos,
        COALESCE(n.nombre, 'Novato') as nivel
    FROM usuario u
    LEFT JOIN usuario_nivel un ON u.id = un.usuario_id
    LEFT JOIN nivel n ON (
        n.puntos_requeridos <= COALESCE(un.puntos, 0) 
        AND n.puntos_requeridos = (
            SELECT MAX(puntos_requeridos) 
            FROM nivel 
            WHERE puntos_requeridos <= COALESCE(un.puntos, 0)
        )
    )
    ORDER BY un.puntos DESC, u.nombre ASC
");

$usuarios_query->execute();
$usuarios_result = $usuarios_query->get_result();

$usuarios_con_nivel = [];
while ($usuario = $usuarios_result->fetch_assoc()) {
    $usuarios_con_nivel[] = $usuario;
}

$usuarios_query->close();
$conexion->close();
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estadísticas - Mundial 2026</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        :root {
            --primary-color: #2d4f23;
            --secondary-color: #3d6b2f;
            --accent-color: #a5cc7a;
            --background-color: #f5f8f0;
            --text-color: #333;
            --light-text: #fff;
            --card-bg: #ffffff;
            --shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            --selected-border: 4px solid #2d4f23;
        }

        body {
            background-color: var(--background-color);
            color: var(--text-color);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .header {
            background-color: var(--primary-color);
            color: var(--light-text);
            padding: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .logo {
            font-family: "Fjalla One", sans-serif;
            font-size: 1.5rem;
            letter-spacing: 2px;
        }

        .user-actions {
            display: flex;
            gap: 1rem;
        }

        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }

        .btn-primary {
            background-color: var(--accent-color);
            color: var(--text-color);
        }

        .btn-primary:hover {
            background-color: #8bb86b;
            transform: translateY(-2px);
        }

        .btn-info {
            background-color: #3d6b2f;
            color: white;
        }

        .btn-info:hover {
            background-color: #2d4f23;
            transform: translateY(-2px);
        }

        .stats-container {
            flex: 1;
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }

        .stats-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .stats-header h1 {
            font-size: 2.5rem;
            color: var(--primary-color);
            margin-bottom: 0.5rem;
        }

        .stats-header p {
            font-size: 1.1rem;
            color: #666;
        }

        .users-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .user-card {
            background-color: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: var(--shadow);
            transition: all 0.3s;
            border-left: 4px solid var(--accent-color);
        }

        .user-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .user-avatar {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 1.2rem;
            margin-right: 1rem;
        }

        .user-info {
            flex: 1;
        }

        .user-name {
            font-size: 1.2rem;
            font-weight: bold;
            color: var(--primary-color);
            margin-bottom: 0.25rem;
        }

        .user-email {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }

        .user-details {
            display: flex;
            justify-content: space-between;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
        }

        .level-badge {
            background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
            color: white;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9rem;
        }

        .points {
            color: var(--primary-color);
            font-weight: bold;
            font-size: 1.1rem;
        }

        .rank-number {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary-color);
            margin-right: 1rem;
            min-width: 40px;
            text-align: center;
        }

        .footer {
            background-color: var(--accent-color);
            padding: 1.5rem;
            text-align: center;
            margin-top: auto;
        }

        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
        }

        .copyright {
            color: var(--text-color);
            font-size: 0.9rem;
        }

        .stats-summary {
            background-color: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
            display: flex;
            justify-content: space-around;
            text-align: center;
        }

        .stat-item {
            padding: 0 1rem;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary-color);
        }

        .stat-label {
            color: #666;
            font-size: 0.9rem;
        }

        .medal {
            font-size: 1.5rem;
            margin-right: 0.5rem;
        }

        .gold { color: #FFD700; }
        .silver { color: #C0C0C0; }
        .bronze { color: #CD7F32; }

        @media (max-width: 768px) {
            .stats-container {
                padding: 1rem;
            }

            .stats-header h1 {
                font-size: 2rem;
            }

            .users-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            .stats-summary {
                flex-direction: column;
                gap: 1rem;
            }

            .header {
                flex-direction: column;
                gap: 1rem;
                padding: 1rem 0.5rem;
            }
        }

        @media (max-width: 480px) {
            .stats-header h1 {
                font-size: 1.8rem;
            }

            .user-card {
                padding: 1rem;
            }

            .user-details {
                flex-direction: column;
                gap: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="logo">MUNDIAL 2026</div>
        <div class="user-actions">
            <a href="inicio.php" class="btn btn-primary">
                <i class="fas fa-arrow-left me-1"></i>Volver al Chat
            </a>
            <form method="POST" style="display: inline;">
                <button type="submit" name="logout" class="btn btn-info">
                    <i class="fas fa-sign-out-alt me-1"></i>Cerrar Sesión
                </button>
            </form>
        </div>
    </header>

    <div class="stats-container">
        <div class="stats-header">
            <h1><i class="fas fa-chart-line me-2"></i>Estadísticas de Usuarios</h1>
            <p>Ranking de usuarios con puntación más alta</p>
        </div>

        <?php if (count($usuarios_con_nivel) > 0): ?>
            <div class="stats-summary">
                <div class="stat-item">
                    <div class="stat-value"><?php echo count($usuarios_con_nivel); ?></div>
                    <div class="stat-label">Usuarios Totales</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value"><?php echo max(array_column($usuarios_con_nivel, 'puntos')); ?></div>
                    <div class="stat-label">Puntos Máximos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value"><?php echo round(array_sum(array_column($usuarios_con_nivel, 'puntos')) / count($usuarios_con_nivel), 1); ?></div>
                    <div class="stat-label">Promedio de Puntos</div>
                </div>
            </div>

            <div class="users-grid">
                <?php foreach ($usuarios_con_nivel as $index => $usuario): ?>
                    <div class="user-card">
                        <div class="d-flex align-items-start">
                            <div class="rank-number">
                                <?php if ($index == 0): ?>
                                    <i class="fas fa-trophy gold medal"></i>
                                <?php elseif ($index == 1): ?>
                                    <i class="fas fa-trophy silver medal"></i>
                                <?php elseif ($index == 2): ?>
                                    <i class="fas fa-trophy bronze medal"></i>
                                <?php else: ?>
                                    #<?php echo $index + 1; ?>
                                <?php endif; ?>
                            </div>
                            <div class="user-avatar">
                                <?php echo getIniciales($usuario['nombre']); ?>
                            </div>
                            <div class="user-info">
                                <div class="user-name"><?php echo htmlspecialchars($usuario['nombre']); ?></div>
                                <div class="user-email"><?php echo htmlspecialchars($usuario['email']); ?></div>
                                <small class="text-muted">
                                    Miembro desde: <?php echo date('d/m/Y', strtotime($usuario['fecha_registro'])); ?>
                                </small>
                                
                                <div class="user-details">
                                    <div class="points">
                                        <i class="fas fa-star me-1"></i><?php echo $usuario['puntos']; ?> pts
                                    </div>
                                    <div class="level-badge">
                                        <?php echo htmlspecialchars($usuario['nivel']); ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div class="text-center py-5">
                <i class="fas fa-users fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No hay usuarios registrados</h4>
            </div>
        <?php endif; ?>
    </div>

    <footer class="footer">
        <div class="footer-content">
            <div class="copyright">© 2026 App Social del Mundial</div>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

<?php
function getIniciales($nombre) {
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