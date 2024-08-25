import {animedetect, sharpen, cv} from "./anime"

(async() => {
    //const result = await animedetect("https://s1.zerochan.net/Klee.600.3643630.jpg", {writeDir: "./images"})
    //console.log(result)

    const result = await sharpen("https://s1.zerochan.net/Klee.600.3643630.jpg")
    result.write("./sharp.png")
})()
