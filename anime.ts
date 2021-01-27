import axios from "axios"
import Color from "color"
import ffmpeg from "fluent-ffmpeg"
import fs from "fs"
import gifFrames from "gif-frames"
import cv, {Rect, Vec3} from "opencv4nodejs"
import path from "path"
import util from "util"

const exec = util.promisify(require("child_process").exec)

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
    objects: Array<{
        height: number
        width: number
        x: number
        y: number
    }>
    numDetections: number[]
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
    const bin = await axios.get(link, {responseType: "arraybuffer", headers}).then((r) => r.data)
    fs.writeFileSync(dest, Buffer.from(bin, "binary"))
}

const detectImage = async (link: string, options?: DetectAnimeOptions) => {
    if (!options) options = {}
    let temp = ""
    if (link.startsWith("http")) {
        if (options.downloadDir) {
            if (!fs.existsSync(options.downloadDir)) fs.mkdirSync(options.downloadDir, {recursive: true})
            await download(link, `${options.downloadDir}/${path.basename(link)}`)
            link = `${options.downloadDir}/${path.basename(link)}`
        } else {
            temp = `./${path.basename(link)}`
            await download(link, temp)
            link = temp
        }
    }
    const img = await cv.imreadAsync(link, cv.IMREAD_COLOR)
    if (!options.cascade) options.cascade = path.join(__dirname, `../cascade/animeface.xml`)
    const classifier = new cv.CascadeClassifier(options.cascade)
    const grayImg = img.bgrToGray()
    if (!options.scaleFactor) options.scaleFactor = 1.1
    if (!options.minNeighbors) options.minNeighbors = 5
    const minSize = options.minSize?.[0] && options.minSize[1] ? new cv.Size(options.minSize[0], options.minSize[1]) : new cv.Size()
    const maxSize = options.maxSize?.[0] && options.maxSize[1] ? new cv.Size(options.maxSize[0], options.maxSize[1]) : new cv.Size()
    let result = await classifier.detectMultiScaleAsync(grayImg, options.scaleFactor, options.minNeighbors, 0, minSize, maxSize) as DetectAnimeResult
    if (result.objects[0] && options.writeDir) {
        if (!fs.existsSync(options.writeDir)) fs.mkdirSync(options.writeDir, {recursive: true})
        if (!options.thickness) options.thickness = 2
        let color = new Vec3(44, 41, 255)
        if (options.color) {
            const c = new Color(options.color)
            color = new Vec3(c.blue(), c.green(), c.red())
        }
        result.objects.map((rect) => {
            img.drawRectangle(rect as Rect, color, options?.thickness)
        })
        const dest = `${options.writeDir}/${path.basename(link, path.extname(link))}-result${path.extname(link)}`
        await cv.imwriteAsync(dest, img)
        result = {...result, dest}
    }
    if (temp) fs.unlinkSync(temp)
    return result.objects[0] ? result : null
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
