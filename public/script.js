let isAdmin = false;

document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.getElementById("resultados");
  const formWrapper = document.getElementById("form-wrapper");
  const loginModal = document.getElementById("login-modal");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  loginModal.style.display = "none";

  const resCoches = await fetch("/api/coches");
  const coches = await resCoches.json();

  // ⬇️ filtros
  const tipoInput   = document.getElementById("filtro-tipo");
  const marcaInput  = document.getElementById("filtro-marca");
  const anioInput   = document.getElementById("filtro-anio");
  const resetBtn    = document.getElementById("filtro-reset");
  const buscarInput = document.getElementById("filtro-buscar"); // NUEVO

  // Rellenar marcas únicas en el select
  const marcasUnicas = [...new Set(coches.map(c => (c.marca || '').trim()))].filter(Boolean).sort();
  marcasUnicas.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    marcaInput.appendChild(opt);
  });

  // Normaliza texto (quita acentos y pasa a minúsculas)
  function norm(s) {
    return (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  async function renderizarFiltrado() {
    contenedor.innerHTML = "";
    try {
      const resCoches = await fetch("/api/coches");
      const coches = await resCoches.json();

      const tipo   = tipoInput.value;
      const marca  = marcaInput.value;
      const anio   = parseInt(anioInput.value) || 0;
      const q      = norm(buscarInput ? buscarInput.value : "");

      const filtrados = coches.filter(c => {
        const okTipo  = (tipo === ""  || (c.tipo && c.tipo === tipo));
        const okMarca = (marca === "" || (c.marca && c.marca.trim() === marca));
        const okAnio  = (c.anio >= anio);

        // 🔎 Búsqueda libre (marca + modelo + descripción + características)
        const hayBusqueda = q.length > 0;
        let okBusqueda = true;
        if (hayBusqueda) {
          const campo = [
            c.marca, 
            c.modelo,
            c.descripcion,
            Array.isArray(c.caracteristicas) ? c.caracteristicas.join(" ") : (c.caracteristicas || "")
          ].map(norm).join(" ");
          okBusqueda = campo.includes(q);
        }

        return okTipo && okMarca && okAnio && okBusqueda;
      });

      contenedor.innerHTML = "";

      filtrados.forEach((coche) => {
        const div = document.createElement("div");
        div.className = "coche";
        div.innerHTML = `
          <img src="${coche.imagenes?.[0] || ''}" alt="${coche.marca} ${coche.modelo}">
          <div class="info">
            <h3>${coche.marca} ${coche.modelo}</h3>
            <p><strong>Año:</strong> ${coche.anio}</p>
            <p><strong>Kilómetros:</strong> ${Number(coche.km).toLocaleString()} Km</p>
            <p class="precio">${(coche.precio||0).toLocaleString()} €</p>
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
            const res = await fetch(`/api/coches/${coche._id}`, { method: "DELETE", credentials: "include" });
            if (res.ok) { alert("Coche eliminado ✅"); renderizarFiltrado(); }
            else { alert("Error al eliminar ❌"); }
          });
          div.querySelector(".info").appendChild(btn);
        }

        contenedor.appendChild(div);
      });

    } catch (err) {
      console.error("❌ Error al cargar los coches:", err);
      contenedor.innerHTML = "<p style='color:red;'>Error cargando coches.</p>";
    }
  }

  // Eventos de filtros
  tipoInput.addEventListener("change", renderizarFiltrado);
  marcaInput.addEventListener("change", renderizarFiltrado);
  anioInput.addEventListener("input", renderizarFiltrado);

  // Debounce para la búsqueda (evita recalcular por cada tecla)
  let buscarTimer;
  if (buscarInput) {
    buscarInput.addEventListener("input", () => {
      clearTimeout(buscarTimer);
      buscarTimer = setTimeout(renderizarFiltrado, 200);
    });
  }

  // Reset (incluye limpiar la búsqueda)
  resetBtn.addEventListener("click", () => {
    tipoInput.value = "";
    marcaInput.value = "";
    anioInput.value = "";
    if (buscarInput) buscarInput.value = "";
    renderizarFiltrado();
  });

  // Estado sesión / admin
  try {
    const res = await fetch("/api/logged", { credentials: "include" });
    const data = await res.json();
    isAdmin = !!data.admin;

    if (isAdmin) {
      formWrapper && (formWrapper.style.display = "block");
      loginModal.style.display = "none";
      loginBtn && (loginBtn.style.display = "none");
      logoutBtn && (logoutBtn.style.display = "inline-block");
    } else {
      formWrapper && (formWrapper.style.display = "none");
      loginBtn && (loginBtn.style.display = "inline-block");
      logoutBtn && (logoutBtn.style.display = "none");
    }
  } catch (e) {
    console.error("Error comprobando sesión", e);
  }

  renderizarFiltrado();
});

// 🔐 LOGIN
function mostrarLogin(){ document.getElementById("login-modal").style.display="flex"; }
function ocultarLogin(){ document.getElementById("login-modal").style.display="none"; }

async function loginAdmin(){
  const usuario = document.getElementById("usuario").value;
  const password = document.getElementById("password").value;
  const res = await fetch("/api/login", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ usuario, password }), credentials: "include"
  });
  if(res.ok) location.reload();
  else document.getElementById("login-error").innerText = "Usuario o contraseña incorrectos.";
}
async function cerrarSesion(){ await fetch("/api/logout"); location.reload(); }

// 📤 Alta coches (drag&drop de imágenes del alta)
let fileList = [];
const inputImagenes = document.getElementById("imagenes");
const preview = document.getElementById("preview");

if (inputImagenes) {
  inputImagenes.addEventListener("change", () => { fileList = Array.from(inputImagenes.files); mostrarPreview(); });
  function mostrarPreview() {
    preview.innerHTML = "";
    fileList.forEach((file, index) => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.style.width = "100px";
      img.style.cursor = "grab";
      img.setAttribute("draggable", true);
      img.dataset.index = index;
      img.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", index));
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
    const formData = new FormData(form);
    fileList.forEach(file => formData.append("imagenes", file));

    try {
      const res = await fetch("/api/coches", { method: "POST", body: formData, credentials: "include" });
      if (res.ok) { alert("Coche subido correctamente ✅"); location.reload(); }
      else { alert("Error al subir el coche ❌"); }
    } catch (err) {
      console.error(err); alert("Error al enviar coche");
    }
  });

  // Formulario contacto general
  const formBusqueda = document.getElementById("form-contacto-header");
  if (formBusqueda) {
    formBusqueda.addEventListener("submit", async function(e){
      e.preventDefault();
      const formData = new FormData(this);
      try{
        const res = await fetch("/api/buscocoche", { method:"POST", body: formData });
        if(res.ok){ alert("✅ Tu solicitud ha sido enviada correctamente."); this.reset(); document.getElementById("contacto-overlay").style.display="none"; }
        else{ alert("❌ Error al enviar la solicitud."); }
      }catch(err){ console.error("❌ Error al enviar:", err); alert("❌ Error al conectar con el servidor."); }
    });
  }
}
