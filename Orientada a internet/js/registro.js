document.addEventListener("DOMContentLoaded", function () {
  
  const goToLoginBtn = document.getElementById("go-to-login");
  if (goToLoginBtn) {
    goToLoginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "login.php";
    });
  }

  
  const goToRegisterBtn = document.getElementById("go-to-register");
  if (goToRegisterBtn) {
    goToRegisterBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "registro.php";
    });
  }

  
  const registroForm = document.getElementById("registroForm");
  if (registroForm) {
    registroForm.addEventListener("submit", function (e) {
      
      
      validarFormulario();
      
    });
  }

  
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      if (!validarLogin()) {
        e.preventDefault();
      }
    });
  }

  
  const passwordInput = document.getElementById("password");
  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      validarPasswordEnTiempoReal(this.value);
    });
  }
});

function validarFormulario() {
  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  let esValido = true;

  if (nombre === "") {
    alert("Por favor, ingrese su nombre completo.");
    document.getElementById("nombre").focus();
    esValido = false;
  }

  if (email === "") {
    alert("Por favor, ingrese su correo electronico.");
    document.getElementById("email").focus();
    esValido = false;
  } else if (!validarEmail(email)) {
    alert("Por favor, ingrese un correo electronico valido.");
    document.getElementById("email").focus();
    esValido = false;
  }

  if (password === "") {
    alert("Por favor, ingrese una contraseña.");
    document.getElementById("password").focus();
    esValido = false;
  } else if (password.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres.");
    document.getElementById("password").focus();
    esValido = false;
  }

  return esValido;
}

function validarPasswordEnTiempoReal(password) {
  const requirements = {
    length: password.length >= 6,
    uppercase: /[A-ZÑ]/.test(password),
    lowercase: /[a-zñ]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()\-_=+{};:,<.>¿?¡°|]/.test(password),
  };

  
  console.log("Requisitos contraseña:", requirements);
}

function validarLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (email === "") {
    alert("Por favor, ingrese su correo electronico.");
    document.getElementById("email").focus();
    return false;
  }

  if (password === "") {
    alert("Por favor, ingrese su contraseña.");
    document.getElementById("password").focus();
    return false;
  }

  return true;
}

function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
