import detectAnime from "./anime"

(async() => {
    const result = await detectAnime("https://i.pximg.net/img-original/img/2018/03/30/23/05/21/67991994_p0.png", {writeDir: "./images"})
    console.log(result)
})()
