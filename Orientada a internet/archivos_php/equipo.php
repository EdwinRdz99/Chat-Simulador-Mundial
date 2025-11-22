<?php
session_start();
include("configuracion.php");

if (!isset($_SESSION['usuario_id'])) {
  header("Location: ../archivos_php/login.php");
  exit();
}

$conexion = new mysqli($server, $user, $pass, $bd);
$usuario_actual_id = $_SESSION['usuario_id'];
$usuario_actual_nombre = $_SESSION['usuario_nombre'];
?>

<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Seleccionar Equipo - Mundial 2026</title>
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
      rel="stylesheet"
      integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
      crossorigin="anonymous"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <link rel="stylesheet" href="../css/equipo.css" />
  </head>
  <body>
    <header class="header">
      <div class="logo">MUNDIAL 2026</div>
      <div class="user-actions">
        <span style="color: white; margin-right: 15px;">Hola, <?php echo htmlspecialchars($usuario_actual_nombre); ?></span>
        <button class="btn btn-primary" id="regresarBtn">Regresar</button>
      </div>
    </header>

    <main class="seleccion-container">
      <div class="seleccion-header">
        <h1>¿Quién crees que va a ganar?</h1>
        <p>Selecciona el equipo que crees que será campeón del Mundial 2026</p>
      </div>

      <div class="equipos-grid">
        <div class="equipo-card" data-equipo="Argentina">
          <div class="escudo-container">
            <img src="../imagenes/Argentina.png" alt="Argentina" class="escudo" />
          </div>
          <h3>Argentina</h3>
        </div>

        <div class="equipo-card" data-equipo="Brasil">
          <div class="escudo-container">
            <img src="../imagenes/Brasil.png" alt="Brasil" class="escudo" />
          </div>
          <h3>Brasil</h3>
        </div>

        <div class="equipo-card" data-equipo="Africa">
          <div class="escudo-container">
            <img src="../imagenes/Africa.png" alt="África" class="escudo" />
          </div>
          <h3>Selección Africana</h3>
        </div>

        <div class="equipo-card" data-equipo="Colombia">
          <div class="escudo-container">
            <img src="../imagenes/Colombia.png" alt="Colombia" class="escudo" />
          </div>
          <h3>Colombia</h3>
        </div>

        <div class="equipo-card" data-equipo="Mexico">
          <div class="escudo-container">
            <img src="../imagenes/Mexico.png" alt="México" class="escudo" />
          </div>
          <h3>México</h3>
        </div>

        <div class="equipo-card" data-equipo="Uruguay">
          <div class="escudo-container">
            <img src="../imagenes/Uruguay.png" alt="Uruguay" class="escudo" />
          </div>
          <h3>Uruguay</h3>
        </div>

        <div class="equipo-card" data-equipo="USA">
          <div class="escudo-container">
            <img src="../imagenes/USA.png" alt="USA" class="escudo" />
          </div>
          <h3>Estados Unidos</h3>
        </div>

        <div class="equipo-card" data-equipo="Japon">
          <div class="escudo-container">
            <img src="../imagenes/Japon.png" alt="Japón" class="escudo" />
          </div>
          <h3>Japón</h3>
        </div>

        <div class="equipo-card" data-equipo="Iran">
          <div class="escudo-container">
            <img src="../imagenes/Iran.png" alt="Irán" class="escudo" />
          </div>
          <h3>Irán</h3>
        </div>

        <div class="equipo-card" data-equipo="Corea">
          <div class="escudo-container">
            <img src="../imagenes/Corea.png" alt="Corea" class="escudo" />
          </div>
          <h3>Corea del Sur</h3>
        </div>

        <div class="equipo-card" data-equipo="Ecuador">
          <div class="escudo-container">
            <img src="../imagenes/Ecuador.png" alt="Ecuador" class="escudo" />
          </div>
          <h3>Ecuador</h3>
        </div>

        <div class="equipo-card" data-equipo="Australia">
          <div class="escudo-container">
            <img src="../imagenes/Australia.png" alt="Australia" class="escudo" />
          </div>
          <h3>Australia</h3>
        </div>

        <div class="equipo-card" data-equipo="Canada">
          <div class="escudo-container">
            <img src="../imagenes/Canada.png" alt="Canadá" class="escudo" />
          </div>
          <h3>Canadá</h3>
        </div>

        <div class="equipo-card" data-equipo="Paraguay">
          <div class="escudo-container">
            <img src="../imagenes/Paraguay.png" alt="Paraguay" class="escudo" />
          </div>
          <h3>Paraguay</h3>
        </div>

        <div class="equipo-card" data-equipo="Uzbekistan">
          <div class="escudo-container">
            <img src="../imagenes/Uzbekistan.png" alt="Uzbekistán" class="escudo" />
          </div>
          <h3>Uzbekistán</h3>
        </div>

        <div class="equipo-card" data-equipo="NZ">
          <div class="escudo-container">
            <img src="../imagenes/NZ.jpg" alt="Nueva Zelanda" class="escudo" />
          </div>
          <h3>Nueva Zelanda</h3>
        </div>

        <div class="equipo-card" data-equipo="Jordan">
          <div class="escudo-container">
            <img src="../imagenes/Jordan.png" alt="Jordania" class="escudo" />
          </div>
          <h3>Jordania</h3>
        </div>
      </div>

      <div class="seleccion-actions">
        <p id="equipoSeleccionadoText">Ningún equipo seleccionado</p>
        <button class="btn btn-confirmar" id="confirmarBtn" disabled>
          Confirmar selección
        </button>
      </div>
    </main>

    <!-- Modal de carga -->
    <div class="modal fade" id="loadingModal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body text-center">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <h5>Simulando el Mundial 2026...</h5>
            <p>Calculando resultados del torneo</p>
          </div>
        </div>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-content">
        <div class="copyright">© 2026 App Social del Mundial</div>
      </div>
    </footer>

    <script
      src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"
      integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM"
      crossorigin="anonymous"
    ></script>
    <script src="../js/equipo.js"></script>
  </body>
</html>
<?php
$conexion->close();
?>