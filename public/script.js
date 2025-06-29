let isAdmin = false;

// 🧠 CARGAR Y MOSTRAR COCHES

document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.getElementById("resultados");
  const formWrapper = document.getElementById("form-wrapper");
  const loginModal = document.getElementById("login-modal");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  loginModal.style.display = "none";

  const resCoches = await fetch("/api/coches");
  const coches = await resCoches.json();

  const estadoInput = document.getElementById("filtro-estado");
  const marcaInput = document.getElementById("filtro-marca");
  const anioInput = document.getElementById("filtro-anio");
  const resetBtn = document.getElementById("filtro-reset");

  const marcasUnicas = [...new Set(coches.map(c => c.marca))];
  marcasUnicas.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    marcaInput.appendChild(opt);
  });

  function renderizarFiltrado() {
    contenedor.innerHTML = "";
    const estado = estadoInput.value;
    const marca = marcaInput.value;
    const anio = parseInt(anioInput.value) || 0;

    const filtrados = coches.filter(c =>
      (estado === "" || c.estado === estado) &&
      (marca === "" || c.marca === marca) &&
      (c.anio >= anio)
    );

    filtrados.forEach((coche) => {
  const div = document.createElement("div");
  div.className = "coche";
  div.innerHTML = `
    <img src="${coche.imagenes?.[0]}" alt="${coche.marca} ${coche.modelo}">
    <div class="info">
      <h3>${coche.marca} ${coche.modelo}</h3>
      <p><strong>Año:</strong> ${coche.anio}</p>
      <p><strong>Kilómetros:</strong> ${Number(coche.km).toLocaleString()} km</p>
      <p><strong>Estado:</strong> ${coche.estado}</p>
      <p class="precio">${coche.precio.toLocaleString()} €</p>
      <a href="coche.html?id=${coche._id}" class="ver-detalles">Ver detalles</a>
    </div>
  `;

  if (isAdmin) {
    const btn = document.createElement("button");
    btn.className = "eliminar-coche";
    btn.dataset.id = coche._id;
    btn.textContent = "Eliminar";
    btn.style.cssText = "margin-top:10px;background:#a00;color:white;border:none;padding:6px 14px;border-radius:5px;font-weight:bold;cursor:pointer;";
    btn.addEventListener("click", async () => {
      if (!confirm("¿Seguro que quieres eliminar este coche?")) return;
      const res = await fetch(`/api/coches/${coche._id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        alert("Coche eliminado ✅");
        renderizarFiltrado();
      } else {
        alert("Error al eliminar ❌");
      }
    });
    div.querySelector(".info").appendChild(btn);
  }

  contenedor.appendChild(div);
});

  }

  estadoInput.addEventListener("change", renderizarFiltrado);
  marcaInput.addEventListener("change", renderizarFiltrado);
  anioInput.addEventListener("input", renderizarFiltrado);
  resetBtn.addEventListener("click", () => {
    estadoInput.value = "";
    marcaInput.value = "";
    anioInput.value = "";
    renderizarFiltrado();
  });

  try {
    const res = await fetch("/api/logged", { credentials: "include" });
    const data = await res.json();
    isAdmin = data.admin;

    if (data.admin) {
      formWrapper.style.display = "block";
      loginModal.style.display = "none";
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
    } else {
      formWrapper.style.display = "none";
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
    }
  } catch (e) {
    console.error("Error comprobando sesión", e);
  }

  renderizarFiltrado();
});


// 🔐 LOGIN FUNCTIONS
function mostrarLogin() {
  const loginModal = document.getElementById("login-modal");
  loginModal.style.display = "flex";
}

function ocultarLogin() {
  const loginModal = document.getElementById("login-modal");
  loginModal.style.display = "none";
}

async function loginAdmin() {
  const usuario = document.getElementById("usuario").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ usuario, password }),
  credentials: "include"  // 🔐 NECESARIO para guardar la sesión
});


  if (res.ok) {
    location.reload();
  } else {
    document.getElementById("login-error").innerText = "Usuario o contraseña incorrectos.";
  }
}

async function cerrarSesion() {
  await fetch("/api/logout");
  location.reload();
}

let fileList = [];

const inputImagenes = document.getElementById("imagenes");
const preview = document.getElementById("preview");

if (inputImagenes) {
  inputImagenes.addEventListener("change", () => {
    fileList = Array.from(inputImagenes.files);
    mostrarPreview();
  });

  function mostrarPreview() {
    preview.innerHTML = "";
    fileList.forEach((file, index) => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.style.width = "100px";
      img.style.cursor = "grab";
      img.setAttribute("draggable", true);
      img.dataset.index = index;

      img.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", index);
      });

      img.addEventListener("dragover", (e) => e.preventDefault());

      img.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData("text/plain"));
        const to = parseInt(e.target.dataset.index);
        const moved = fileList.splice(from, 1)[0];
        fileList.splice(to, 0, moved);
        mostrarPreview();
      });

      preview.appendChild(img);
    });
  }

  document.getElementById("form-coche").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData();

    [...form.elements].forEach(el => {
      if (el.name && el.type !== "file") {
        formData.append(el.name, el.value);
      }
    });

    fileList.forEach(file => {
      formData.append("imagenes", file);
    });

    try {
      const res = await fetch("/api/coches", {
  method: "POST",
  body: formData,
  credentials: "include"  // 🔐 añade esto
});


      if (res.ok) {
        alert("Coche subido correctamente ✅");
        location.reload();
      } else {
        alert("Error al subir el coche ❌");
      }
    } catch (err) {
      console.error(err);
      alert("Error al enviar coche");
    }
  });

  
// 📩 Enviar formulario del contacto general (busco coche)
const formBusqueda = document.getElementById("form-contacto-header");
if (formBusqueda) {
  formBusqueda.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    try {
      const res = await fetch("/api/buscocoche", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        alert("✅ Tu solicitud ha sido enviada correctamente.");
        this.reset();
        document.getElementById("contacto-overlay").style.display = "none";
      } else {
        alert("❌ Error al enviar la solicitud.");
      }
    } catch (err) {
      console.error("❌ Error al enviar:", err);
      alert("❌ Error al conectar con el servidor.");
    }
  });
}


}