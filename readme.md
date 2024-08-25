<div align="left">
  <p>
    <a href="https://moebits.github.io/animedetect"><img src="https://raw.githubusercontent.com/Moebits/animedetect/master/assets/animedetectlogo.png" width="600" /></a>
  </p>
  <p>
    <a href="https://nodei.co/npm/animedetect/"><img src="https://nodei.co/npm/animedetect.png" /></a>
  </p>
</div>

### About
This package uses [**OpenCV.js**](https://opencv.org/) and the [**lbpcascade_animeface**](https://github.com/nagadomi/lbpcascade_animeface) cascade to detect anime faces in images, gifs, or videos. For video detection you also need to have [**ffmpeg**](https://ffmpeg.org/) installed.

### Insall
```ts
npm install animedetect
```

#### Basic Usage
There is just one exported function that accepts either a link or file path to an image, gif, or video. If openCV detects an
anime character, it returns `DetectAnimeResult`, otherwise it returns `null`. That's it.
```ts
import {animedetect} from "animedetect"

const image = await animedetect("https://i.pximg.net/img-original/img/2020/12/13/00/00/01/86261493_p0.png")
const gif = await animedetect("https://media.giphy.com/media/XOYUlNCFwsivS/giphy.gif")
const video = await animedetect("https://thumbs.gfycat.com/BriskRegularAnt-mobile.mp4")
```

#### Advanced Usage
```ts
/*You can specify a custom cascade file so in theory, you can use this to detect any object.*/
const customObject = await animedetect("./images/obj.png", {cascade: "cascade.xml"})

/*Fine tune the results by setting scaleFactor, minNeighbors, etc.*/
const withOptions = await animedetect("./images/stuff.jpg", {scaleFactor: 1.1, minNeighbors: 5, minSize: [24, 24]})

/*Set the writeDir to draw a rectangle over the detected area and write the file to that directory. The destination will
be available in the result under the dest property. You can also specify the color and thickness.*/
const drawRectangle = await animedetect("./images/anime.png", {writeDir: "./images", color: "blue", thickness: 2})

/*Gifs have an additional option skipFactor that may speed things up on large files. Setting it to 2 will only extract
every other frame, for example.*/
const fasterGif = await animedetect("./images/largegif.gif", {skipFactor: 2})

/*You can also optimize videos by setting a lower framerate (default is the same as original).*/
const fasterVideo = await animedetect("./videos/episode.mp4", {framerate: 24})

/*Set the downloadDir to download an image, gif, or video locally if you pass in a link.*/
const download = await animedetect("https://i.pximg.net/img-original/img/2014/04/30/02/44/47/43194202_p0.jpg", {downloadDir: "./images"})
```

#### Misc
```ts
import {sharpen} from "animedetect"

/*A sharpen function, which also uses OpenCV, is also exported. It returns a jimp image.*/
const sharpened = await sharpen("./images/img.png", {sigma: 1, amount: 1})
sharpened.write("./sharp.png")
```

#### AnimeDetectOptions
```ts
export interface AnimeDetectOptions {
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

#### AnimeDetectResult
Only videos and gifs will have the frame property (frame where the anime character was detected).
The dest property is available if you set the writeDir to draw the rectangles.
```ts
export interface AnimeDetectResult {
    frame?: number
    dest?: string
    objects: RectVector
}
```

<details>
<summary><a href="https://www.pixiv.net/en/artworks/67991994">Source</a></summary>
<img src="https://raw.githubusercontent.com/Moebits/animedetect/master/assets/example.png"/>
</details>