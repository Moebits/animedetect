import Color from "color"
import jimp from "jimp"
import cv from "./opencv.js"
import ffmpeg from "fluent-ffmpeg"
import fs from "fs"
import gifFrames from "gif-frames"
import path from "path"
import util from "util"

const exec = util.promisify(require("child_process").exec)

export declare class Point {
    public constructor(x: number, y: number)
    public x: number
    public y: number
}

export declare class Size {
    public constructor(width: number, height: number)
    public width: number
    public height: number
}

export declare class Rect {
    public constructor()
    public constructor(point: Point, size: Size)
    public constructor(x: number, y: number, width: number, height: number)
    public x: number
    public y: number
    public width: number
    public height: number
}

export declare class Vector<T> {
    isAliasOf(other: any): boolean
    clone(): any
    delete(): any
    isDeleted(): boolean
    deleteLater(): any
    get(i: number): T
    get(i: number, j: number, data: any): T
    set(i: number, t: T): void
    put(i: number, j: number, data: any): any
    size(): number
    push_back(n: T): any
    resize(count: number, value?: T): void
}

export declare class RectVector extends Rect implements Vector<Rect> {
    get(i: number): Rect;
    isAliasOf(...a: any[]): any;
    clone(...a: any[]): any;
    delete(...a: any[]): any;
    isDeleted(...a: any[]): any;
    deleteLater(...a: any[]): any;
    set(i: number, t: Rect): void;
    put(i: number, j: number, data: any): any;
    size(): number;
    push_back(n: Rect): void;
    resize(count: number, value?: Rect | undefined): void;
    delete(): void;
}

export interface DetectAnimeOptions {
    cascade?: string
    scaleFactor?: number
    minNeighbors?: number
    minSize?: number[]
    maxSize?: number[]
    skipFactor?: number
    framerate?: number
    ffmpegPath?: string
    downloadDir?: string
    thickness?: number
    color?: string
    writeDir?: string
}

export interface DetectAnimeResult {
    frame?: number
    dest?: string
    objects: RectVector
}

const videoExtensions = [".mp4", ".mov", ".avi", ".flv", ".mkv", ".webm"]

const parseFramerate = async (file: string, ffmpegPath?: string) => {
    const command = `${ffmpegPath ? ffmpegPath : "ffmpeg"} -i ${file}`
    const str = await exec(command).then((s: any) => s.stdout).catch((e: any) => e.stderr)
    return Number(str.match(/[0-9]* (?=fps,)/)[0])
}

const removeDirectory = (dir: string) => {
    if (dir === "/" || dir === "./") return
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(function(entry) {
            const entryPath = path.join(dir, entry)
            if (fs.lstatSync(entryPath).isDirectory()) {
                removeDirectory(entryPath)
            } else {
                fs.unlinkSync(entryPath)
            }
        })
        try {
            fs.rmdirSync(dir)
        } catch (e) {
            console.log(e)
        }
    }
}

const download = async (link: string, dest: string) => {
    const headers = {"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36", "referer": "https://www.pixiv.net/"}
    const bin = await fetch(link, {headers}).then((r) => r.arrayBuffer()) as any
    fs.writeFileSync(dest, Buffer.from(bin, "binary"))
}

const matToJimp = (mat: cv.Mat) => {
    const channels = mat.channels()
    const {cols: width, rows: height} = mat
    const jimpImage = new jimp(width, height)
    // Handling Grayscale Images
    if (channels === 1) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelValue = mat.ucharAt(y, x)
                const color = jimp.rgbaToInt(pixelValue, pixelValue, pixelValue, 255)
                jimpImage.setPixelColor(color, x, y)
            }
        }
    } 
    // Handling RGB Images
    else if (channels === 3) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const r = mat.ucharPtr(y, x)[0]
                const g = mat.ucharPtr(y, x)[1]
                const b = mat.ucharPtr(y, x)[2]
                const color = jimp.rgbaToInt(r, g, b, 255)
                jimpImage.setPixelColor(color, x, y)
            }
        }
    } 
    // Handling RGBA Images
    else if (channels === 4) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const r = mat.ucharPtr(y, x)[0]
                const g = mat.ucharPtr(y, x)[1]
                const b = mat.ucharPtr(y, x)[2]
                const a = mat.ucharPtr(y, x)[3]
                const color = jimp.rgbaToInt(r, g, b, a)
                jimpImage.setPixelColor(color, x, y)
            }
        }
    }
    return jimpImage
}

const detectImage = async (link: string, options?: DetectAnimeOptions) => {
    if (!options) options = {}
    let imgData = await jimp.read(link)
    const img = cv.matFromImageData(imgData.bitmap)
    const newImg = img.clone()
    const grayImg = new cv.Mat()
    cv.cvtColor(img, grayImg, cv.COLOR_RGBA2GRAY, 0)

    if (!options.cascade) options.cascade = path.join(__dirname, `../cascade/lbpcascade_animeface.xml`)
    const data = new Uint8Array(fs.readFileSync(options.cascade))
    cv.FS_createDataFile("/", "lbpcascade_animeface.xml", data, true, false, false)
    const classifier = new cv.CascadeClassifier("lbpcascade_animeface.xml")

    if (!options.scaleFactor) options.scaleFactor = 1.1
    if (!options.minNeighbors) options.minNeighbors = 5
    const minSize = options.minSize?.[0] && options.minSize[1] ? new cv.Size(options.minSize[0], options.minSize[1]) : new cv.Size(0, 0)
    const maxSize = options.maxSize?.[0] && options.maxSize[1] ? new cv.Size(options.maxSize[0], options.maxSize[1]) : new cv.Size(0, 0)

    const objects = new cv.RectVector()
    classifier.detectMultiScale(grayImg, objects, options.scaleFactor, options.minNeighbors, 0, minSize, maxSize)
    console.log(objects.size())

    let result = {objects} as any

    if (objects.size() && options.writeDir) {
        if (!fs.existsSync(options.writeDir)) fs.mkdirSync(options.writeDir, {recursive: true})
        if (!options.thickness) options.thickness = 1
        
        let color = [255, 44, 41, 255]
        if (options.color) {
            const c = new Color(options.color)
            color = [255, c.blue(), c.green(), c.red()]
        }
        for (let i = 0; i < objects.size(); i++) {
            const point1 = new cv.Point(objects.get(i).x, objects.get(i).y)
            const point2 = new cv.Point(objects.get(i).x + objects.get(i).width, objects.get(i).y + objects.get(i).height)
            cv.rectangle(newImg, point1, point2, color, options.thickness)
        }
        const dest = `${options.writeDir}/${path.basename(link, path.extname(link))}-result${path.extname(link)}`
        const jimpImage = matToJimp(newImg)
        console.log(jimpImage)
        jimpImage.write(dest)
        result = {...result, dest}
    }
    return objects.size() ? result as unknown as DetectAnimeResult : null
}

const detectGIF = async (link: string, options?: DetectAnimeOptions) => {
    if (!options) options = {}
    if (link.startsWith("http") && options.downloadDir) {
        if (!fs.existsSync(options.downloadDir)) fs.mkdirSync(options.downloadDir, {recursive: true})
        await download(link, `${options.downloadDir}/${path.basename(link)}`)
        link = `${options.downloadDir}/${path.basename(link)}`
    }
    const baseDir = options.downloadDir ? options.downloadDir : (options.writeDir ? options.writeDir : ".")
    const frameDest = `${baseDir}/${path.basename(link, path.extname(link))}Frames`
    if (fs.existsSync(frameDest)) removeDirectory(frameDest)
    fs.mkdirSync(frameDest, {recursive: true})
    const frames = await gifFrames({url: link, frames: "all", cumulative: true})
    if (Number(options.skipFactor) < 1) options.skipFactor = 1
    const constraint = options.skipFactor ? frames.length / options.skipFactor : frames.length
    const step = Math.ceil(frames.length / constraint)
    const frameArray: string[] = []
    const promiseArray: Array<Promise<void>> = []
    for (let i = 0; i < frames.length; i += step) {
        const writeStream = fs.createWriteStream(`${frameDest}/${path.basename(link, path.extname(link))}frame${i + 1}.jpg`)
        frames[i].getImage().pipe(writeStream)
        frameArray.push(`${frameDest}/${path.basename(link, path.extname(link))}frame${i + 1}.jpg`)
        promiseArray.push(new Promise((resolve) => writeStream.on("finish", resolve)))
    }
    await Promise.all(promiseArray)
    let result = null as DetectAnimeResult | null
    for (let i = 0; i < frameArray.length; i++) {
        result = await detectImage(frameArray[i], options)
        if (result) {
            result = {...result, frame: i + 1}
            break
        }
    }
    removeDirectory(frameDest)
    return result
}

const detectVideo = async (link: string, options?: DetectAnimeOptions) => {
    if (!options) options = {}
    if (link.startsWith("http") && options.downloadDir) {
        if (!fs.existsSync(options.downloadDir)) fs.mkdirSync(options.downloadDir, {recursive: true})
        await download(link, `${options.downloadDir}/${path.basename(link)}`)
        link = `${options.downloadDir}/${path.basename(link)}`
    }
    if (options.ffmpegPath) ffmpeg.setFfmpegPath(options.ffmpegPath)
    if (!options.framerate) options.framerate = await parseFramerate(link, options.ffmpegPath)
    const baseDir = options.downloadDir ? options.downloadDir : (options.writeDir ? options.writeDir : ".")
    const frameDest = `${baseDir}/${path.basename(link, path.extname(link))}Frames`
    if (fs.existsSync(frameDest)) removeDirectory(frameDest)
    fs.mkdirSync(frameDest, {recursive: true})
    const framerate = ["-r", `${options.framerate}`]
    await new Promise<void>((resolve) => {
        ffmpeg(link).outputOptions([...framerate])
        .save(`${frameDest}/${path.basename(link, path.extname(link))}frame%d.png`)
        .on("end", () => resolve())
    })
    const frameArray = fs.readdirSync(frameDest).map((f) => `${frameDest}/${f}`).sort(new Intl.Collator(undefined, {numeric: true, sensitivity: "base"}).compare)
    let result = null as DetectAnimeResult | null
    for (let i = 0; i < frameArray.length; i++) {
        result = await detectImage(frameArray[i], options)
        if (result) {
            result = {...result, frame: i + 1}
            break
        }
    }
    removeDirectory(frameDest)
    return result
}

export default async function detectAnime(link: string, options?: DetectAnimeOptions) {
    if (!path.extname(link)) return Promise.reject("link or file path is invalid")
    if (path.extname(link) === ".gif") return detectGIF(link, options)
    if (videoExtensions.includes(path.extname(link))) return detectVideo(link, options)
    return detectImage(link, options)
}

module.exports.default = detectAnime
module.exports = detectAnime
