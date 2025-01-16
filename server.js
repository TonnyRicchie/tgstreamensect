const express = require('express');
const fetch = require('node-fetch');
const app = express();

const TOKEN = '7525106329:AAFY_Qx57KcCIIVH4uL2_d1YUdkHdWJM0Tw';
const PORT = process.env.PORT || 3000;

// Middleware para CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    next();
});

app.get('/ping', (req, res) => {
    res.send('OK');
});

app.get('/:fileId', async (req, res) => {
    try {
        console.log(`Procesando solicitud para fileId: ${req.params.fileId}`);
        const fileId = req.params.fileId;

        // Obtener información del archivo de Telegram
        const fileInfoResponse = await fetch(
            `https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`,
            { method: 'GET' }
        );

        if (!fileInfoResponse.ok) {
            console.error('Error en respuesta de Telegram:', await fileInfoResponse.text());
            return res.status(404).send('Archivo no encontrado - Error en API de Telegram');
        }

        const fileData = await fileInfoResponse.json();
        
        if (!fileData.ok || !fileData.result || !fileData.result.file_path) {
            console.error('Respuesta inválida de Telegram:', fileData);
            return res.status(404).send('Archivo no encontrado - Datos inválidos');
        }

        const filePath = fileData.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;

        // Obtener información del archivo
        const headResponse = await fetch(fileUrl, { method: 'HEAD' });
        if (!headResponse.ok) {
            console.error('Error al obtener headers del archivo:', headResponse.status);
            return res.status(404).send('Archivo no encontrado - Error al acceder');
        }

        const totalSize = parseInt(headResponse.headers.get('content-length'));

        // Configurar tipo de contenido
        let contentType = 'application/octet-stream';
        if (filePath.endsWith('.mp4')) contentType = 'video/mp4';
        if (filePath.endsWith('.webm')) contentType = 'video/webm';
        if (filePath.endsWith('.mov')) contentType = 'video/quicktime';
        if (filePath.endsWith('.mkv')) contentType = 'video/x-matroska';
        if (filePath.endsWith('.mp3')) contentType = 'audio/mpeg';
        if (filePath.endsWith('.m4a')) contentType = 'audio/mp4';
        if (filePath.endsWith('.wav')) contentType = 'audio/wav';
        if (filePath.endsWith('.ogg')) contentType = 'audio/ogg';

        // Configurar headers básicos
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        // Manejar solicitudes de rango (streaming)
        const range = req.headers.range;
        if (range) {
            const parts = range.replace('bytes=', '').split('-');
            const start = parseInt(parts[0]);
            const end = parts[1] ? parseInt(parts[1]) : totalSize - 1;
            const chunkSize = end - start + 1;

            console.log(`Streaming range: ${start}-${end}/${totalSize}`);

            const streamResponse = await fetch(fileUrl, {
                headers: { Range: `bytes=${start}-${end}` }
            });

            if (!streamResponse.ok) {
                console.error('Error en streaming:', streamResponse.status);
                return res.status(500).send('Error en streaming');
            }

            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
            res.setHeader('Content-Length', chunkSize);
            streamResponse.body.pipe(res);
        } else {
            // Streaming completo
            console.log(`Streaming archivo completo: ${totalSize} bytes`);
            const streamResponse = await fetch(fileUrl);
            
            if (!streamResponse.ok) {
                console.error('Error en streaming completo:', streamResponse.status);
                return res.status(500).send('Error en streaming');
            }

            res.setHeader('Content-Length', totalSize);
            streamResponse.body.pipe(res);
        }

    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).send('Error interno del servidor');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log('Servidor listo para streaming');
});
