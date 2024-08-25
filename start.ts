import animeDetect from "./anime"

(async() => {
    const result = await animeDetect("https://s1.zerochan.net/Klee.600.3643630.jpg", {writeDir: "./images"})
    console.log(result)
})()
