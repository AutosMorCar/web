document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id || id.length < 10) {
    document.body.innerHTML = "<h2 style='text-align:center; color:red;'>❌ ID inválido</h2>";
    return;
  }

  // ¿Es admin?
  let isAdmin = false;
  try {
    const r = await fetch("/api/logged", { credentials: "include" });
    const d = await r.json();
    isAdmin = !!d.admin;
  } catch {}

  // Carga coche por ID
  let coche;
  try {
    const res = await fetch(`/api/coches/${id}`);
    if (!res.ok) throw new Error("No encontrado");
    coche = await res.json();
  } catch (err) {
    console.error("❌ Error cargando coche:", err);
    document.body.innerHTML = "<h2 style='text-align:center; color:red;'>❌ Coche no encontrado</h2>";
    return;
  }

  // Título y campos ocultos para formularios de contacto
  document.title = `${coche.marca} ${coche.modelo} | Carmazon`;
  const nombreCoche = `${coche.marca} ${coche.modelo}`;
  const inputCoche = document.getElementById("coche-modal-nombre");
  if (inputCoche) inputCoche.value = nombreCoche;
  const hidden = document.getElementById("coche-hidden");
  if (hidden) hidden.value = nombreCoche;

  // Info coche (usa "Tipo" en vez de Estado)
  const info = document.getElementById("info");
  info.innerHTML = `
    <h2>${coche.marca} ${coche.modelo}</h2>
    <p><strong>Precio:</strong> ${(coche.precio??0).toLocaleString()} €</p>
    <p><strong>Año:</strong> ${coche.anio ?? "N/A"}</p>
    <p><strong>Kilómetros:</strong> ${Number(coche.km ?? coche.kilometros ?? 0).toLocaleString()} km</p>
    ${(() => {
      const lista = Array.isArray(coche.caracteristicas) ? coche.caracteristicas :
                    (coche.caracteristicas || "").split(",");
      if (!lista.length || !lista[0]?.trim()) return "";
      return `<div style="margin-top:20px;"><br>${
        lista.map(car => car.trim()).filter(Boolean)
            .map(car => `<span style="display:inline-block; background:#790f0f; color:#fff; padding:5px 10px; margin:5px 5px 0 0; border-radius:5px; font-size:14px;">${car}</span>`)
            .join("")
      }</div>`;
    })()}
  `;

  // Galería
  const imagenes = document.getElementById("imagenes");
  (coche.imagenes || []).forEach(url => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `<img src="${url}" alt="Imagen del coche">`;
    imagenes.appendChild(slide);
  });
  new Swiper(".swiper-container", {
    loop:true, slidesPerView:1, spaceBetween:10,
    pagination:{ el:".swiper-pagination", clickable:true },
    navigation:{ nextEl:".swiper-button-next", prevEl:".swiper-button-prev" }
  });

  // ====== EDICIÓN (solo admin) ======
  const btnEditar = document.getElementById("btn-editar");
  const modal = document.getElementById("editar-modal");
  const formEditar = document.getElementById("form-editar");
  const editarClose = document.getElementById("editar-close");

  if (isAdmin && btnEditar && modal && formEditar) {
    btnEditar.style.display = "inline-block";

    // Pre-cargar valores cuando abrimos
    btnEditar.addEventListener("click", () => {
      formEditar.marca.value  = coche.marca || "";
      formEditar.modelo.value = coche.modelo || "";
      formEditar.precio.value = coche.precio || "";
      formEditar.anio.value   = coche.anio || "";
      formEditar.km.value     = coche.km || "";
      formEditar.tipo.value   = coche.tipo || "";
      formEditar.descripcion.value = coche.descripcion || "";
      formEditar.caracteristicas.value = Array.isArray(coche.caracteristicas)
        ? coche.caracteristicas.join(", ")
        : (coche.caracteristicas || "");
      modal.style.display = "flex";
    });

    editarClose.addEventListener("click", () => modal.style.display = "none");
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    // Enviar PUT
    formEditar.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(formEditar); // incluye campos + posibles imágenes nuevas

      try {
        const res = await fetch(`/api/coches/${id}`, {
          method: "PUT",
          body: fd,
          credentials: "include"
        });
        if (res.ok) {
          alert("✅ Anuncio actualizado");
          location.reload();
        } else {
          const t = await res.text();
          alert("❌ Error al actualizar: " + t);
        }
      } catch (err) {
        console.error(err);
        alert("❌ Error de conexión");
      }
    });
  }
});

// ===== CONTACTO MODAL (igual que tenías)
window.mostrarFormularioContacto = function () {
  const overlay = document.getElementById("contacto-overlay");
  if (overlay) overlay.style.display = "flex";
};
window.ocultarFormularioContacto = function () {
  const overlay = document.getElementById("contacto-overlay");
  if (overlay) overlay.style.display = "none";
};
window.mostrarModalCoche = function (nombreCoche) {
  const modal = document.getElementById("contacto-modal-coche");
  const input = document.getElementById("coche-modal-nombre");
  if (modal && input) { modal.style.display = "flex"; input.value = nombreCoche; }
};
window.ocultarModalCoche = function () {
  const modal = document.getElementById("contacto-modal-coche");
  if (modal) modal.style.display = "none";
};

// Formularios de contacto (igual)
const formCoche = document.getElementById("formulario-coche-modal");
if (formCoche) {
  formCoche.addEventListener("submit", async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    try {
      const res = await fetch("/api/contacto", { method: "POST", body: formData });
      if (res.ok) { alert("✅ Consulta enviada correctamente."); this.reset(); ocultarModalCoche(); }
      else { alert("❌ Error al enviar la consulta."); }
    } catch (err) {
      console.error("❌ Error al enviar:", err); alert("❌ Error de conexión con el servidor.");
    }
  });
}
const formBusqueda = document.getElementById("form-contacto-header");
if (formBusqueda) {
  formBusqueda.addEventListener("submit", async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    try {
      const res = await fetch("/api/buscocoche", { method: "POST", body: formData });
      if (res.ok) { alert("✅ Tu solicitud ha sido enviada correctamente."); this.reset(); window.ocultarFormularioContacto?.(); }
      else { alert("❌ Error al enviar la solicitud."); }
    } catch (err) {
      console.error("❌ Error al enviar:", err); alert("❌ Error de conexión con el servidor.");
    }
  });
}
