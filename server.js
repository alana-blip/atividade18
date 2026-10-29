
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/api/buscar', async (req, res) => {
    const { astro } = req.query;
    if (!astro) return res.status(400).json({ erro: 'Faltou o termo.' });

    const apiKey = process.env.NASA_API_KEY || 'PcK8PGWMHMhPdtcGQnF7KnNbNqHdh9HnmjwrmGQq';
    const astroAlvo = astro.trim().toLowerCase();

    try {
        const url = `https://science.nasa.gov/wp-json/wp/v2/apod-basic/?api_key=${apiKey}&start_date=2026-08-01&end_date=2026-10-27`;
        
        const response = await axios.get(url);
        const data = Array.isArray(response.data) ? response.data : [response.data];

        const imagensFiltradas = data.filter(item => {
            const ehImagem = item.media_type === 'image';

            const copyrightLower = item.copyright ? item.copyright.toLowerCase() : '';
            const semCopyright = !item.copyright || 
                                 copyrightLower.includes('nasa') || 
                                 copyrightLower.includes('public domain') ||
                                 copyrightLower.includes('domínio público');

            const contemAstro = (item.title && item.title.toLowerCase().includes(astroAlvo)) ||
                                (item.explanation && item.explanation.toLowerCase().includes(astroAlvo));

            return ehImagem && semCopyright && contemAstro;
        });

        const resultado = imagensFiltradas.map(item => ({
            titulo: item.title,
            url: item.hdurl || item.url,
            data: item.date,
            alt: item.alt || item.title
        }));

        return res.json(resultado);

    } catch (error) {
        console.error('Erro no servidor ao buscar APOD:', error.message);
        return res.status(500).json({ erro: 'Erro ao processar dados da NASA.' });
    }
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Carrossel NASA APOD</title>
            <style>
                body { background: #0b0f19; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 50px; }
                h1 { color: #4f46e5; }
                .busca { margin-bottom: 20px; display: flex; gap: 10px; }
                input { padding: 10px; border-radius: 5px; border: 1px solid #333; background: #1f2937; color: white; width: 250px; }
                button { padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
                #statusMessage { margin-top: 10px; color: #aaa; }
                
                #carouselContainer { position: relative; width: 600px; height: 400px; overflow: hidden; margin-top: 20px; display: none; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); background: #000; }
                #carouselTrack { display: flex; width: 100%; height: 100%; transition: transform 0.4s ease-in-out; }
                .carousel-item { min-width: 100%; height: 100%; position: relative; flex-shrink: 0; }
                .carousel-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .carousel-caption { position: absolute; bottom: 0; left: 0; background: rgba(0,0,0,0.85); width: 100%; padding: 12px; text-align: center; box-sizing: border-box; }
                .carousel-caption h3 { margin: 0 0 5px 0; font-size: 16px; color: #fff; }
                .carousel-caption p { margin: 0; font-size: 12px; color: #aaa; }
                .nav-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.3); border: none; color: white; padding: 15px; cursor: pointer; font-size: 18px; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; z-index: 10; }
                #btnAnterior { left: 10px; } #btnProximo { right: 10px; }
            </style>
        </head>
        <body>
            <h1>Carrossel Espacial NASA (APOD)</h1>
            <div class="busca">
                <input type="text" id="inputAstro" placeholder="ex: nebula, galaxy, moon, sun, comet">
                <button id="btnBuscar">Buscar</button>
            </div>
            <p id="statusMessage">Digite um termo em inglês e clique em Buscar.</p>
            
            <div id="carouselContainer">
                <div id="carouselTrack"></div>
                <button class="nav-btn" id="btnAnterior">&#10094;</button>
                <button class="nav-btn" id="btnProximo">&#10095;</button>
            </div>

            <script>
                const btnBuscar = document.getElementById('btnBuscar');
                const carouselContainer = document.getElementById('carouselContainer');
                const carouselTrack = document.getElementById('carouselTrack');
                const statusMessage = document.getElementById('statusMessage');
                const btnAnterior = document.getElementById('btnAnterior');
                const btnProximo = document.getElementById('btnProximo');

                let imagensFiltradas = [];
                let currentIndex = 0;

                btnBuscar.addEventListener('click', async () => {
                    const astroAlvo = document.getElementById('inputAstro').value.trim();
                    if (!astroAlvo) {
                        alert('Por favor, digite o nome de um astro para pesquisar.');
                        return;
                    }

                    statusMessage.textContent = 'Buscando dados na NASA...';
                    carouselContainer.style.display = 'none';
                    carouselTrack.innerHTML = '';

                    try {
                        const res = await fetch('/api/buscar?astro=' + encodeURIComponent(astroAlvo));
                        imagensFiltradas = await res.json();

                        if (imagensFiltradas.length > 0) {
                            statusMessage.textContent = \`Sucesso! Encontradas \${imagensFiltradas.length} imagens para "\${astroAlvo}".\`;
                            gerarSlides();
                        } else {
                            statusMessage.textContent = \`Nenhuma imagem sem copyright encontrada para "\${astroAlvo}" neste período. Tente pesquisar outro astro (em inglês, ex: nebula, galaxy, moon, sun, comet, saturn).\`;
                        }
                    } catch (error) {
                        statusMessage.textContent = 'Erro ao processar dados.';
                    }
                });

                function gerarSlides() {
                    currentIndex = 0;
                    carouselTrack.style.transform = 'translateX(0%)';

                    imagensFiltradas.forEach(item => {
                        const slide = document.createElement('div');
                        slide.classList.add('carousel-item');

                        slide.innerHTML = \`
                            <img src="\${item.url}" alt="\${item.alt || item.titulo}" loading="lazy">
                            <div class="carousel-caption">
                                <h3>\${item.titulo}</h3>
                                <p>Data de Registro: \${item.data}</p>
                            </div>
                        \`;
                        carouselTrack.appendChild(slide);
                    });

                    carouselContainer.style.display = 'block';
                }

                function atualizarPosicao() {
                    carouselTrack.style.transform = \`translateX(-\${currentIndex * 100}%)\`;
                }

                btnProximo.addEventListener('click', () => {
                    if (currentIndex < imagensFiltradas.length - 1) {
                        currentIndex++;
                        atualizarPosicao();
                    }
                });

                btnAnterior.addEventListener('click', () => {
                    if (currentIndex > 0) {
                        currentIndex--;
                        atualizarPosicao();
                    }
                });
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
