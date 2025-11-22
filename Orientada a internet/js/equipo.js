document.addEventListener("DOMContentLoaded", function () {
  
  document.getElementById("regresarBtn").addEventListener("click", function () {
    window.location.href = "../archivos_php/inicio.php";
  });

  
  let equipoSeleccionado = null;
  const equipoSeleccionadoText = document.getElementById(
    "equipoSeleccionadoText"
  );
  const confirmarBtn = document.getElementById("confirmarBtn");
  const equipoCards = document.querySelectorAll(".equipo-card");

  
  equipoCards.forEach((card) => {
    card.addEventListener("click", function () {
      
      if (equipoSeleccionado) {
        document
          .querySelector(`[data-equipo="${equipoSeleccionado}"]`)
          .classList.remove("selected");
      }

      
      equipoSeleccionado = this.getAttribute("data-equipo");
      this.classList.add("selected");

      
      equipoSeleccionadoText.textContent = `Seleccionado: ${equipoSeleccionado}`;
      confirmarBtn.disabled = false;
    });
  });

  
  confirmarBtn.addEventListener("click", function () {
    if (equipoSeleccionado) {
      
      const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
      loadingModal.show();

      
      const formData = new FormData();
      formData.append('equipo_seleccionado', equipoSeleccionado);

      fetch('procesar_simulador.php', {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Error en la respuesta del servidor');
        }
        return response.json();
      })
      .then(data => {
        loadingModal.hide();
        
        if (data.success) {
          mostrarResultados(data);
        } else {
          alert('Error en la simulación: ' + (data.error || 'Error desconocido'));
        }
      })
      .catch(error => {
        loadingModal.hide();
        console.error('Error:', error);
        alert('Error de conexión: ' + error.message);
      });
    }
  });

  function mostrarResultados(data) {
    let mensaje = '';
    let esGanador = data.campeon === data.equipo_seleccionado;
    
    if (esGanador) {
      mensaje = `¡FELICITACIONES! 🎉\n\n` +
                `Tu selección ${data.equipo_seleccionado} ha ganado el Mundial 2026!\n\n` +
                `🏆 Campeón: ${data.campeon}\n` +
                `🥈 Subcampeón: ${data.subcampeon}\n\n` +
                `Has ganado ${data.puntos_obtenidos} puntos!\n` +
                `Puntos totales: ${data.nuevos_puntos}\n` +
                `Nuevo nivel: ${data.nuevo_nivel}`;
    } else {
      mensaje = `¡Buena suerte para la próxima! ⚽\n\n` +
                `Tu selección ${data.equipo_seleccionado} no ganó el torneo.\n\n` +
                `🏆 Campeón: ${data.campeon}\n` +
                `🥈 Subcampeón: ${data.subcampeon}\n\n` +
                `Has ganado ${data.puntos_obtenidos} punto(s) por participar!\n` +
                `Puntos totales: ${data.nuevos_puntos}\n` +
                `Nivel: ${data.nuevo_nivel}`;
    }

    
    const modalHtml = `
      <div class="modal fade" id="resultadosModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header ${esGanador ? 'bg-success text-white' : 'bg-primary text-white'}">
              <h5 class="modal-title">${esGanador ? '¡FELICITACIONES! 🎉' : 'Resultados del Mundial'}</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="text-center mb-4">
                <i class="fas ${esGanador ? 'fa-trophy text-warning' : 'fa-futbol text-primary'} fa-4x mb-3"></i>
                <h4>${esGanador ? '¡TU EQUIPO GANÓ!' : 'Tu equipo no ganó'}</h4>
              </div>
              
              <div class="row text-center mb-3">
                <div class="col-6">
                  <div class="border rounded p-2">
                    <strong>Tu selección</strong><br>
                    <span class="h5">${data.equipo_seleccionado}</span>
                  </div>
                </div>
                <div class="col-6">
                  <div class="border rounded p-2">
                    <strong>Campeón</strong><br>
                    <span class="h5">${data.campeon}</span>
                  </div>
                </div>
              </div>
              
              <div class="alert ${esGanador ? 'alert-success' : 'alert-info'}">
                <div class="d-flex justify-content-between">
                  <span>Puntos ganados:</span>
                  <strong>${data.puntos_obtenidos}</strong>
                </div>
                <div class="d-flex justify-content-between">
                  <span>Puntos totales:</span>
                  <strong>${data.nuevos_puntos}</strong>
                </div>
                <div class="d-flex justify-content-between">
                  <span>Nivel:</span>
                  <strong>${data.nuevo_nivel}</strong>
                </div>
              </div>
              
              ${!esGanador ? `
              <div class="text-center text-muted">
                <small>¡Sigue participando para subir de nivel!</small>
              </div>
              ` : ''}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
              <button type="button" class="btn btn-primary" id="volverInicioBtn">Volver al Inicio</button>
            </div>
          </div>
        </div>
      </div>
    `;

    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    
    const resultadosModal = new bootstrap.Modal(document.getElementById('resultadosModal'));
    resultadosModal.show();

    
    document.getElementById('volverInicioBtn').addEventListener('click', function() {
      resultadosModal.hide();
      setTimeout(() => {
        window.location.href = "../archivos_php/inicio.php";
      }, 300);
    });

    
    document.getElementById('resultadosModal').addEventListener('hidden.bs.modal', function() {
      this.remove();
    });
  }

  
  const escudos = document.querySelectorAll(".escudo");
  escudos.forEach((escudo) => {
    escudo.addEventListener("error", function () {
      this.src =
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMWUxZTEiLz48dGV4dCB4PSIzNSIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSI+RXNjdWRvPC90ZXh0Pjwvc3ZnPg==";
      console.warn(`No se pudo cargar el escudo: ${this.alt}`);
    });
  });

  
  equipoCards.forEach((card) => {
    card.addEventListener('mouseenter', function() {
      if (!this.classList.contains('selected')) {
        this.style.transform = 'scale(1.02)';
        this.style.transition = 'transform 0.2s ease';
      }
    });

    card.addEventListener('mouseleave', function() {
      if (!this.classList.contains('selected')) {
        this.style.transform = 'scale(1)';
      }
    });
  });

  
  let enviando = false;
  confirmarBtn.addEventListener('click', function() {
    if (enviando) {
      return;
    }
    enviando = true;
    
    
    setTimeout(() => {
      enviando = false;
    }, 3000);
  });
});