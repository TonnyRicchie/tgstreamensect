const express = require('express');
const fetch = require('node-fetch');
const app = express();

const TOKEN = '7525106329:AAFY_Qx57KcCIIVH4uL2_d1YUdkHdWJM0Tw';
const PORT = process.env.PORT || 3000;

app.get('/ping', (req, res) => {
    res.send('OK');
});

app.get('/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileInfo = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
        const fileData = await fileInfo.json();
        
        if (!fileData.ok) {
            console.error('Error al obtener información del archivo:', fileData);
            return res.status(404).send('Archivo no encontrado');
        }

        const filePath = fileData.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
        
        // Obtener el tamaño total del archivo
        const headResponse = await fetch(fileUrl, { method: 'HEAD' });
        const totalSize = parseInt(headResponse.headers.get('content-length'));

        // Configurar el tipo de contenido
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
        res.setHeader('Access-Control-Allow-Origin', '*');
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

            const fileResponse = await fetch(fileUrl, {
                headers: { Range: `bytes=${start}-${end}` }
            });

            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
            res.setHeader('Content-Length', chunkSize);
            fileResponse.body.pipe(res);
        } else {
            // Streaming completo
            console.log(`Streaming archivo completo: ${totalSize} bytes`);
            const fileResponse = await fetch(fileUrl);
            res.setHeader('Content-Length', totalSize);
            fileResponse.body.pipe(res);
        }

    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error del servidor');
    }
});

// Manejo de errores general
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).send('Error interno del servidor');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`URL base: https://tgstreamensect.onrender.com`);
});
