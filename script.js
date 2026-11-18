const camara = document.getElementById("camara");
const boton = document.getElementById("iniciar");
const estado = document.getElementById("estado");
const contadorPersonas = document.getElementById("contador-personas");
const estadoAlerta = document.getElementById("estado-alerta")
const canvas = document.getElementById("recuadros");
const tarjetaAlerta = document.getElementById("tarjeta-alerta");
const indicadorCamara=document.getElementById("indicador-camara");
camara.addEventListener("playing", () => {
    indicadorCamara.textContent = "● En vivo";
    indicadorCamara.classList.add("activa");
});
const ctx = canvas.getContext("2d");
let modelo = null;
const UMBRAL_ALERTA = 2;
let inicioAglomeracion=null;
const TIEMPO_ALERTA = 3000;
let inicioBajda = null;
const TIEMPO_TOLERACIA = 1000;




boton.addEventListener("click", () => {
    estado.textContent = "Activando camara...";
    activarCamara();
});

async function activarCamara() {
    try {
        const video = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            width:  {ideal:640},
            height:{ideal: 480},
            audio: false
        });

        camara.srcObject = video;
        estado.textContent = "cargando la camara ..."
        estado.textContent = "Preparando procesador...";
        await tf.setBackend("webgl");
        await tf.ready();
        console.log("Backend utilizado:", tf.getBackend());
        estado.textContent = "Procesador utilizado: " + tf.getBackend();
        estado.textContent = "Procesador listo. Cargando modelo...";
        const inicio = performance.now();
        const fin = performance.now();
        const segundos = ((fin- inicio)/1000).toFixed(2);
        alert("el modelo tardo"+ segundos + "segundos en cargar");
        modelo = await cocoSsd.load({
            base: "mobilenet_v2"
        });
        estado.textContent = "Modelo de IA cargado correctamente";
        await detectarObjectos();
    } catch (error) {
        estado.textContent = "Error al activar la camara";
        alert("Error: " + error.message);
    }
}



async function detectarObjectos() {

    const predicciones = await modelo.detect(camara, 20, 0.3);
    const personas = predicciones.filter(objecto => objecto.class === "person")
    contadorPersonas.textContent = personas.length;
        canvas.width = camara.videoWidth;
        canvas.height = camara.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        personas.forEach((objecto)=>{
           // console.log(objecto.class);
            // console.log(objecto.bbox);
            const[x, y, ancho, alto] = objecto.bbox;
            console.log("Confianza:", objecto.score);
            const porcentaje = (objecto.score * 100).toFixed(0);
            ctx.strokeStyle = "lime";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, ancho, alto);
            ctx.fillStyle = "lime";
            ctx.font= "18px Arial";
            ctx.fillText(
                objecto.class + " " + porcentaje + "%",
                Math.min(x, Math.max(0, canvas.width -130)),
                Math.max(20, y - 8)
            );
        });
        estado.textContent = "personas detectadas:" + personas.length;

        const ahora = Date.now();
        if(personas.length>= UMBRAL_ALERTA){
            inicioBajda=null;

            if (inicioAglomeracion===null){
                inicioAglomeracion = ahora;
            }
        } else if( inicioAglomeracion !==null){
            if(inicioBajda === null){
                inicioBajda = ahora;
            }
            if ( ahora - inicioBajda >= TIEMPO_TOLERACIA){

                inicioAglomeracion = null;
                inicioBajda=null;
            }
        }

        if(
            inicioAglomeracion !==null &&
            ahora - inicioAglomeracion >= TIEMPO_ALERTA
        ){
            estado.textContent += " | posible aglomeracion";
        }

        const alertaActiva = inicioAglomeracion !== null &&
            ahora - inicioAglomeracion >=TIEMPO_ALERTA;

        estadoAlerta.textContent = alertaActiva
            ? "posible aglomeracion"
            : "sin alerta";
        tarjetaAlerta.classList.toggle("alerta-activa", alertaActiva)
        estadoAlerta.classList.toggle("alerta-activa",alertaActiva)

        requestAnimationFrame(detectarObjectos);
}
