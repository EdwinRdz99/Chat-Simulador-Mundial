<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registrarse</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet"
    integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
  <link rel="stylesheet" href="../css/registro.css" />
</head>

<body>
  <div class="container">
    <header>
      <h1>Registrate</h1>
    </header>

    <main>
      <?php
      
      $mensaje = '';
      $tipoMensaje = '';

      if ($_SERVER["REQUEST_METHOD"] == "POST") {
        
        include("configuracion.php");

       
        $conexion = new mysqli($server, $user, $pass, $bd);

        
        if ($conexion->connect_error) {
          die("Error de conexión: " . $conexion->connect_error);
        }

 
        $nombre = trim($_POST['nombre']);
        $email = trim($_POST['email']);
        $password = $_POST['password'];

      
        if (empty($nombre) || empty($email) || empty($password)) {
          $mensaje = "Todos los campos son obligatorios";
          $tipoMensaje = "error";
        }
      
        else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
          $mensaje = "El correo electrónico no es válido";
          $tipoMensaje = "error";
        }

        else if (!validarEmail($email)) {
          $mensaje = "El dominio del correo electrónico no está permitido";
          $tipoMensaje = "error";
        }
     
        else {
          $errorPassword = validarPassword($password);
          if ($errorPassword !== true) {
            $mensaje = $errorPassword;
            $tipoMensaje = "error";
          } else {
            
            $verificarEmail = $conexion->prepare("SELECT id FROM usuario WHERE email = ?");
            $verificarEmail->bind_param("s", $email);
            $verificarEmail->execute();
            $verificarEmail->store_result();

            if ($verificarEmail->num_rows > 0) {
              $mensaje = "El correo electrónico ya está registrado";
              $tipoMensaje = "error";
            } else {
     
              $passwordHash = password_hash($password, PASSWORD_DEFAULT);

              $insertarUsuario = $conexion->prepare("INSERT INTO usuario (nombre, email, password) VALUES (?, ?, ?)");
              $insertarUsuario->bind_param("sss", $nombre, $email, $passwordHash);

              if ($insertarUsuario->execute()) {
                $mensaje = "¡Registro exitoso! Ahora puedes iniciar sesión";
                $tipoMensaje = "exito";
   
                $nombre = $email = '';
              } else {
                $mensaje = "Error al registrar el usuario: " . $conexion->error;
                $tipoMensaje = "error";
              }
              $insertarUsuario->close();
            }
            $verificarEmail->close();
          }
        }
        $conexion->close();
      }


      if ($mensaje !== '') {
        $color = $tipoMensaje === 'error' ? 'red' : 'green';
        echo "<div style='color: $color; padding: 10px; margin-bottom: 20px; border: 1px solid $color; border-radius: 5px;'>$mensaje</div>";
      }
      ?>

      <form id="registroForm" method="POST" action="">
        <div class="form-group">
          <label for="nombre">Nombre completo:</label>
          <input type="text" id="nombre" name="nombre" required
            value="<?php echo isset($_POST['nombre']) ? htmlspecialchars($_POST['nombre']) : ''; ?>" />
        </div>

        <div class="form-group">
          <label for="email">Correo Electrónico:</label>
          <input type="email" id="email" name="email" required
            value="<?php echo isset($_POST['email']) ? htmlspecialchars($_POST['email']) : ''; ?>" />
        </div>

        <div class="form-group">
          <label for="password">Contraseña:</label>
          <input type="password" id="password" name="password" required />
          <small>La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula, un número y un carácter
            especial.</small>
        </div>

        <button type="submit">Registrarse</button>
        <button type="button" class="btn btn-secondary" id="go-to-login">
          Iniciar Sesión
        </button>
      </form>
    </main>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"
    integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM"
    crossorigin="anonymous"></script>
  <script src="../js/registro.js"></script>
</body>

</html>

<?php
/**
 * Validar dominio de email
 */
function validarEmail($email)
{
  
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    return false;
  }

  
  if (substr_count($email, '@') !== 1) {
    return false;
  }

  $dominiosPermitidos = [
    'gmail.com',
    'hotmail.com',
    'outlook.com',
    'yahoo.com',
    'icloud.com',
    'protonmail.com',
    'aol.com',
    'live.com',
    'msn.com',
    'yandex.com',
    'mail.com',
    'zoho.com',
    'gmx.com',
    'hubspot.com',
    'hey.com',
    'fastmail.com',
    'tutanota.com',
    'pm.me',
    'icloud.com',
    'me.com',
    'uanl.edu.mx'
  ];

  $dominio = explode('@', $email)[1];
  $dominio = strtolower(trim($dominio));

  if (!in_array($dominio, $dominiosPermitidos)) {
    return false;
  }

  return true;
}

/**
 * Validar fortaleza de la contraseña
 */
function validarPassword($password)
{
  if (strlen($password) < 6) {
    return "La contraseña debe tener al menos 6 caracteres";
  }

 
  if (!preg_match('/[A-ZÑ]/', $password)) {
    return "La contraseña debe contener al menos una letra mayúscula";
  }

  if (!preg_match('/[a-zñ]/', $password)) {
    return "La contraseña debe contener al menos una letra minúscula";
  }

 
  if (!preg_match('/[0-9]/', $password)) {
    return "La contraseña debe contener al menos un número";
  }

 
  if (!preg_match('/[!@#$%^&*()\-_=+{};:,<.>¿?¡°|]/', $password)) {
    return "La contraseña debe contener al menos un carácter especial (!@#$%^&*()-_=+{};:,<.>¿?¡°|)";
  }

  return true;
}
?>