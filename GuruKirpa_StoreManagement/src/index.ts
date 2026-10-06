import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import { createServer } from 'node:http'
import productRouter from './Routes/ProductRoutes.js';
import stockRouter from './Routes/stockRoutes.js';
import orderRouter from './Routes/orderRoutes.js';
import authRouter from './Routes/authRoutes.js';
import repairRouter from './Routes/repairRoutes.js';
import panelRouter from './Routes/panelRoutes.js';
async function init() {
    const app = express()
    const server = createServer(app)
    const port = 4000

    app.use(express.json())
    app.use(express.urlencoded())
    app.use(cors())

    app.use('/api', productRouter);
    app.use('/api', stockRouter);
    app.use('/api', orderRouter);
    app.use('/api', authRouter);
    app.use('/api', repairRouter);
    app.use('/api', panelRouter);

    app.get('/', (req, res) => {
        res.status(200).json({ msg: "welcome to the server" })
    })
    server.listen(port, () => {
        console.log(`server is live on port ${port}`)
    })
}
init()