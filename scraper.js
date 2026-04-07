const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ExcelJS = require('exceljs');
const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    // Agregar headers CORS para permitir solicitudes desde Render
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            nombre: 'Proyecto Remate API',
            estado: 'ok',
            endpoints: ['/health', '/propiedades', '/ultimas']
        }));
        return;
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            status: 'ok',
            servicio: 'activo'
        }));
        return;
    }

    if (req.url === '/propiedades') {
    let dbHistorica = [];
    if (fs.existsSync(DB_PATH)) {
        dbHistorica = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    // Transformar datos a la estructura esperada por el frontend
    const getBancoFromContacto = (contacto, descripcion, titulo) => {
        if (!contacto) return 'Banco No Especificado';
        
        const contactoLC = contacto.toLowerCase();
        const descLC = (descripcion || '').toLowerCase();
        const tituloLC = (titulo || '').toLowerCase();
        
        // Mapeo de patrones comunes de bancos chilenos
        const bancosMap = {
            'Banco de Chile': ['banco de chile', '22 3640140', '222364014'],
            'BancoEstado': ['bancoestado', 'fomped', '223'],
            'Scotiabank': ['scotiabank', '620'],
            'Santander': ['santander', '623', '652'],
            'Itaú': ['itau', '627'],
            'Corpbanca': ['corpbanca', '621'],
            'Banco Falabella': ['falabella', '650'],
            'Banco Ripley': ['ripley', '653'],
            'Acciones o Similar': ['acciones', 'similar'],
            'Juzgado o Corte': ['juzgado', 'corte', 'tribunal'],
            'Concesionaria': ['concesionaria', 'caminos']
        };
        
        // Buscar coincidencias
        for (const [banco, patterns] of Object.entries(bancosMap)) {
            for (const pattern of patterns) {
                if (contactoLC.includes(pattern) || descLC.includes(pattern) || tituloLC.includes(pattern)) {
                    return banco;
                }
            }
        }
        
        return 'Banco No Especificado';
    };

    const propiedadesTransformadas = dbHistorica.map((prop, index) => {
        // Extraer ciudad de la ubicación
        const partes = prop.ubicacion ? prop.ubicacion.split(',') : [];
        const ciudad = partes.length > 0 ? partes[partes.length - 1].trim() : 'No especificada';
        
        // Extraer banco usando lógica mejorada
        let banco = prop.banco;
        if (!banco || banco === 'No especificado') {
            banco = getBancoFromContacto(prop.contacto, prop.descripcion, prop.titulo);
        }
        
        // Parsear fecha - manejar formato "DD/M/YYYY"
        let fechaRemate = new Date().toISOString().split('T')[0];
        if (prop.fecha) {
            try {
                const [dia, mes, year] = prop.fecha.split('/');
                const fechaObj = new Date(year, parseInt(mes) - 1, dia);
                if (!isNaN(fechaObj)) {
                    fechaRemate = fechaObj.toISOString().split('T')[0];
                }
            } catch (e) {
                // Si falla, usar la fecha actual
            }
        }
        
        return {
            id: prop.url ? prop.url.split('-').pop() : Math.random().toString(36).substr(2, 9),
            titulo: prop.titulo || 'Sin título',
            ciudad: ciudad,
            direccion: prop.ubicacion || 'No especificada',
            precio: prop.precio_clp || 0,
            superficie: prop.m2 || 0,
            valor_m2: prop.valor_m2 || 0,
            banco: banco,
            contacto: prop.contacto || 'No disponible',
            url: prop.url || '#',
            foto_local: prop.foto_local || 'Sin imagen',
            descripcion: prop.descripcion || 'Sin descripción',
            rol: prop.Rol || 'No encontrado',
            corretaje: prop.corretaje || 'No especificado',
            fecha_remate: fechaRemate
        };
    });

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(propiedadesTransformadas, null, 2));
    return;
}

if (req.url === '/ultimas') {
    let dbHistorica = [];
    if (fs.existsSync(DB_PATH)) {
        dbHistorica = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }

    const ultimas = dbHistorica.slice(-20).reverse();

    // Función para extraer banco
    const getBancoFromContacto = (contacto, descripcion, titulo) => {
        if (!contacto) return 'Banco No Especificado';
        
        const contactoLC = contacto.toLowerCase();
        const descLC = (descripcion || '').toLowerCase();
        const tituloLC = (titulo || '').toLowerCase();
        
        // Mapeo de patrones comunes de bancos chilenos
        const bancosMap = {
            'Banco de Chile': ['banco de chile', '22 3640140', '222364014'],
            'BancoEstado': ['bancoestado', 'fomped', '223'],
            'Scotiabank': ['scotiabank', '620'],
            'Santander': ['santander', '623', '652'],
            'Itaú': ['itau', '627'],
            'Corpbanca': ['corpbanca', '621'],
            'Banco Falabella': ['falabella', '650'],
            'Banco Ripley': ['ripley', '653'],
            'Acciones o Similar': ['acciones', 'similar'],
            'Juzgado o Corte': ['juzgado', 'corte', 'tribunal'],
            'Concesionaria': ['concesionaria', 'caminos']
        };
        
        // Buscar coincidencias
        for (const [banco, patterns] of Object.entries(bancosMap)) {
            for (const pattern of patterns) {
                if (contactoLC.includes(pattern) || descLC.includes(pattern) || tituloLC.includes(pattern)) {
                    return banco;
                }
            }
        }
        
        return 'Banco No Especificado';
    };

    // Transformar datos a la estructura esperada por el frontend
    const ultimasTransformadas = ultimas.map(prop => {
        // Extraer ciudad de la ubicación
        const partes = prop.ubicacion ? prop.ubicacion.split(',') : [];
        const ciudad = partes.length > 0 ? partes[partes.length - 1].trim() : 'No especificada';
        
        // Extraer banco usando lógica mejorada
        let banco = prop.banco;
        if (!banco || banco === 'No especificado') {
            banco = getBancoFromContacto(prop.contacto, prop.descripcion, prop.titulo);
        }
        
        // Parsear fecha - manejar formato "DD/M/YYYY"
        let fechaRemate = new Date().toISOString().split('T')[0];
        if (prop.fecha) {
            try {
                const [dia, mes, year] = prop.fecha.split('/');
                const fechaObj = new Date(year, parseInt(mes) - 1, dia);
                if (!isNaN(fechaObj)) {
                    fechaRemate = fechaObj.toISOString().split('T')[0];
                }
            } catch (e) {
                // Si falla, usar la fecha actual
            }
        }
        
        return {
            id: prop.url ? prop.url.split('-').pop() : Math.random().toString(36).substr(2, 9),
            titulo: prop.titulo || 'Sin título',
            ciudad: ciudad,
            direccion: prop.ubicacion || 'No especificada',
            precio: prop.precio_clp || 0,
            superficie: prop.m2 || 0,
            valor_m2: prop.valor_m2 || 0,
            banco: banco,
            contacto: prop.contacto || 'No disponible',
            url: prop.url || '#',
            foto_local: prop.foto_local || 'Sin imagen',
            descripcion: prop.descripcion || 'Sin descripción',
            rol: prop.Rol || 'No encontrado',
            corretaje: prop.corretaje || 'No especificado',
            fecha_remate: fechaRemate
        };
    });

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(ultimasTransformadas, null, 2));
    return;
}
    
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
}).listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});

const VALOR_UF_HOY = 38500; 
const DB_PATH = './db_historica.json';
const FOTOS_DIR = './fotos_propiedades';
const CATEGORIAS_VALPO = [
    'https://www.economicos.cl/valparaiso/sitio_o_terreno',
    'https://www.economicos.cl/valparaiso/propiedad_industrial',
    'https://www.economicos.cl/valparaiso/parcela_o_chacra'
];

// Asegurar carpetas
if (!fs.existsSync(FOTOS_DIR)) fs.mkdirSync(FOTOS_DIR);

async function descargarImagen(url, nombreArchivo) {
    if (!url || !url.startsWith('http')) return "Sin imagen";
    const ruta = path.join(FOTOS_DIR, nombreArchivo);
    try {
        const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 10000 });
        const writer = fs.createWriteStream(ruta);
        response.data.pipe(writer);
        return new Promise((resolve) => {
            writer.on('finish', () => resolve(nombreArchivo));
            writer.on('error', () => resolve("Error descarga"));
        });
    } catch (e) { return "Error conexión"; }
}

async function ejecutarScraper() {
    console.log('Iniciando Scraper Inteligente (Playwright Edition)');
    
    //  Cargar Memoria
    let dbHistorica = [];
    if (fs.existsSync(DB_PATH)) dbHistorica = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    const urlsExistentes = new Set(dbHistorica.map(p => p.url));

    const browser = await chromium.launch({ headless: true }); 
    const context = await browser.newContext();
    const page = await context.newPage();

    let nuevasPropiedades = [];

    for (const urlBase of CATEGORIAS_VALPO) {
    try {
        console.log(`\n--- Explorando Categoría: ${urlBase.split('/').pop()} ---`);
        await page.goto(urlBase, { waitUntil: 'domcontentloaded', timeout: 15000 });

        try {
            await page.waitForSelector('.result.row-fluid', { timeout: 10000 });
        } catch (e) {
            console.log('Sin resultados visibles en esta página.');
            continue;
        }

        const enlaces = await page.$$eval('.result .col2 a', (links) => {
            return [...new Set(links.map(a => a.href).filter(h => h.includes('.html')))];
        });

        for (const link of enlaces) {
            if (urlsExistentes.has(link)) {
                console.log(`Saltando (Ya existe): ${link.split('/').pop().substring(0, 20)}`);
                continue;
            }

            console.log(`NUEVO: ${link}`);
            const detPage = await context.newPage();

            try {
                await detPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 15000 });

                const titulo = await detPage.innerText('h1').catch(() => 'Sin título');
                let precioRaw = await detPage.locator('.cont_price_detalle_f').innerText().catch(() => 'A consultar');
                const ubicacion = await detPage.locator('.cont_tit_detalle_f h3').first().innerText().catch(() => 'No especificada');
                const m2Raw = await detPage.locator('text=/m2/i').first().innerText().catch(() => '0');
                const contacto = await detPage.innerText('#phone').catch(() => 'No disponible');
                const imagenUrl = await detPage.getAttribute('.cont_ficha_imagen img', 'src').catch(() => null);
                const descripcion = await detPage.innerText('#description p').catch(() => '');

                const match = descripcion.match(/Rol de Avalúo\s*:\s*(\d+-\d+)/i);
                const rol = match ? match[0] : 'Rol no encontrado';

                const matchCorretaje = descripcion.match(/(?:Comisi[oó]n|Corretaje).*?(\d[\d,.]*\s*%)/i);
                const textoCorretaje = matchCorretaje ? matchCorretaje[1] : 'No dice';

                const m2Num = parseInt(m2Raw.replace(/[^0-9]/g, '')) || 0;
                const esUF = precioRaw.toUpperCase().includes('UF');
                const precioNum = parseInt(precioRaw.replace(/[^0-9]/g, '')) || 0;
                const precioCLP = esUF ? (precioNum * VALOR_UF_HOY) : precioNum;
                const valorM2 = (m2Num > 0) ? Math.round(precioCLP / m2Num) : 0;

                const idImg = Date.now();
                const nombreFoto = await descargarImagen(imagenUrl, `foto_${idImg}.jpg`);

                const datoFinal = {
                    fecha: new Date().toLocaleDateString(),
                    titulo: titulo.trim(),
                    precio_clp: precioCLP,
                    m2: m2Num,
                    valor_m2: valorM2,
                    ubicacion: ubicacion.replace('Comuna:', '').trim(),
                    contacto: contacto.trim(),
                    url: link,
                    foto_local: nombreFoto,
                    descripcion: descripcion.slice(0, 150),
                    Rol: rol,
                    corretaje: textoCorretaje
                };

                nuevasPropiedades.push(datoFinal);
                dbHistorica.push(datoFinal);
                urlsExistentes.add(link);
                console.log(`Guardado: ${datoFinal.titulo}`);

                await detPage.close();
                await page.waitForTimeout(1500);
            } catch (e) {
                console.log(`Error analizando detalle: ${e.message}`);
                await detPage.close();
            }
        }
    } catch (e) {
        console.log(`Error explorando categoría ${urlBase}: ${e.message}`);
        continue;
    }
}
    // GUARDAR MEMORIA
    fs.writeFileSync(DB_PATH, JSON.stringify(dbHistorica, null, 2));

    // GENERAR EXCEL solo SI HAY NOVEDADES
    if (nuevasPropiedades.length > 0) {
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Nuevos Terrenos');
        
        ws.columns = [
            { header: 'Fecha', key: 'fecha', width: 12 },
            { header: 'Rol', key: 'Rol', width: 20},
            { header: 'Corretaje', key:'corretaje', width: 20},
            { header: 'Título', key: 'titulo', width: 35 },
            { header: 'Precio CLP', key: 'precio_clp', width: 15 },
            { header: 'Sup. m2', key: 'm2', width: 10 },
            { header: '$/m2', key: 'valor_m2', width: 12 },
            { header: 'Ubicación', key: 'ubicacion', width: 20 },
            { header: 'Contacto', key: 'contacto', width: 15 },
            { header: 'Foto Local', key: 'foto_local', width: 20 },
            { header: 'Link', key: 'url', width: 30 }
            
        ];

        ws.addRows(nuevasPropiedades);
        const filename = `Reporte_Valpo_${new Date().toISOString().split('T')[0]}.xlsx`;
        await workbook.xlsx.writeFile(filename);
        console.log(`\n ¡Terminado! Se encontraron ${nuevasPropiedades.length} novedades.`);
        console.log(`Archivo generado: ${filename}`);
    } else {
        console.log('\nNo se encontraron propiedades nuevas desde la última vez.');
    }

    await browser.close();
}
