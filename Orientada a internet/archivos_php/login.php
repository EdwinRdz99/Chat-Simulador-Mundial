<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Iniciar Sesión</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet"
    integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
  <link rel="stylesheet" href="../css/registro.css" />
</head>

<body>
  <div class="container">
    <header>
      <h1>Iniciar Sesión</h1>
    </header>

    <main>
      <?php
   
      if (isset($_GET['mensaje'])) {
        $mensaje = $_GET['mensaje'];
        $tipo = isset($_GET['tipo']) ? $_GET['tipo'] : 'info';
        $color = $tipo === 'error' ? 'red' : 'green';
        echo "<div style='color: $color; padding: 10px; margin-bottom: 20px; border: 1px solid $color; border-radius: 5px;'>$mensaje</div>";
      }
      ?>

      <form id="loginForm" method="POST" action="">
        <div class="form-container">
          <div class="form-header"></div>
          <div class="form-content">
            <div class="form-group">
              <label for="email">Correo Electrónico</label>
              <input type="email" id="email" name="email" placeholder="Tu correo electrónico" required />
            </div>
            <div class="form-group">
              <label for="password">Contraseña</label>
              <input type="password" id="password" name="password" placeholder="Tu contraseña" required />
            </div>
            <button type="submit" id="login-btn">
              Iniciar Sesión
            </button>
            <button type="button" class="btn btn-secondary" id="go-to-register">
              Registrarse
            </button>
          </div>
        </div>
      </form>
    </main>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"
    integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM"
    crossorigin="anonymous"></script>
  <script src="../js/registro.js"></script>

  <?php
  
  if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    include("configuracion.php");

   
    $conexion = new mysqli($server, $user, $pass, $bd);


    if ($conexion->connect_error) {
      die("Error de conexión: " . $conexion->connect_error);
    }

    $email = trim($_POST['email']);
    $password = $_POST['password'];


    if (empty($email) || empty($password)) {
      header("Location: login.php?mensaje=Todos los campos son obligatorios&tipo=error");
      exit();
    }


    $buscarUsuario = $conexion->prepare("SELECT id, nombre, password FROM usuario WHERE email = ?");
    $buscarUsuario->bind_param("s", $email);
    $buscarUsuario->execute();
    $resultado = $buscarUsuario->get_result();

    if ($resultado->num_rows === 1) {
      $usuario = $resultado->fetch_assoc();

   
      if (password_verify($password, $usuario['password'])) {
      
        session_start();
        $_SESSION['usuario_id'] = $usuario['id'];
        $_SESSION['usuario_nombre'] = $usuario['nombre'];
        $_SESSION['usuario_email'] = $email;

        header("Location: inicio.php");
        exit();
      } else {
        header("Location: login.php?mensaje=Contraseña incorrecta&tipo=error");
      }
    } else {
      header("Location: login.php?mensaje=El correo electrónico no está registrado&tipo=error");
    }

    $buscarUsuario->close();
    $conexion->close();
  }
  ?>
</body>

</html>