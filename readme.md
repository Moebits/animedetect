<div align="left">
  <p>
    <a href="https://tenpi.github.io/detectanime"><img src="https://raw.githubusercontent.com/Tenpi/detectanime/master/assets/detectanimelogo.png" width="600" /></a>
  </p>
  <p>
    <a href="https://nodei.co/npm/detectanime/"><img src="https://nodei.co/npm/detectanime.png" /></a>
  </p>
</div>

### About
This package uses [**OpenCV**](https://opencv.org/) and the [**lbpcascade_animeface**](https://github.com/nagadomi/lbpcascade_animeface) cascade to detect anime faces in images, gifs, or videos. For video detection you also need to have [**ffmpeg**](https://ffmpeg.org/) installed.

### Insall
```ts
npm install detectanime
```

#### Basic Usage
There is just one exported function that accepts either a link or file path to an image, gif, or video. If openCV detects an
anime character, it returns `DetectAnimeResult`, otherwise it returns `null`. That's it.
```ts
import detectanime from "detectanime"

const image = await detectanime("https://i.pximg.net/img-original/img/2020/12/13/00/00/01/86261493_p0.png")
const gif = await detectanime("https://media.giphy.com/media/XOYUlNCFwsivS/giphy.gif")
const video = await detectanime("https://thumbs.gfycat.com/BriskRegularAnt-mobile.mp4")
```

#### Advanced Usage
```ts
/*You can specify a custom cascade file so in theory, you can use this to detect any object.*/
const customObject = await detectanime("./images/obj.png", {cascade: "cascade.xml"})

/*Fine tune the results by setting scaleFactor, minNeighbors, etc.*/
const withOptions = await detectanime("./images/stuff.jpg", {scaleFactor: 1.1, minNeighbors: 5, minSize: [24, 24]})

/*Set the writeDir to draw a rectangle over the detected area and write the file to that directory. The destination will
be available in the result under the dest property. You can also specify the color and thickness.*/
const drawRectangle = await detectanime("./images/anime.png", {writeDir: "./images", color: "blue", thickness: 2})

/*Gifs have an additional option skipFactor that may speed things up on large files. Setting it to 2 will only extract
every other frame, for example.*/
const fasterGif = await detectanime("./images/largegif.gif", {skipFactor: 2})

/*You can also optimize videos by setting a lower framerate (default is the same as original).*/
const fasterVideo = await detectanime("./videos/episode.mp4", {framerate: 24})

/*Set the downloadDir to download an image, gif, or video locally if you pass in a link.*/
const download = await detectanime("https://i.pximg.net/img-original/img/2014/04/30/02/44/47/43194202_p0.jpg", {downloadDir: "./images"})
```

#### DetectAnimeOptions
```ts
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
```

#### DetectAnimeResult
Only videos and gifs will have the frame property (frame where the anime character was detected).
The dest property is available if you set the writeDir to draw the rectangles.
```ts
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
```

<details>
<summary><a href="https://www.pixiv.net/en/artworks/67991994">Source</a></summary>
<img src="https://raw.githubusercontent.com/Tenpi/detectanime/master/assets/example.png" />
</details>