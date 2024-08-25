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

export declare class EmscriptenEmbindInstance {
    isAliasOf(other: any): boolean
    clone(): any
    delete(): any
    isDeleted(): boolean
    deleteLater(): any
}
  
export declare class Vector<T> extends EmscriptenEmbindInstance {
    get(i: number): T
    get(i: number, j: number, data: any): T
    set(i: number, t: T): void
    put(i: number, j: number, data: any): any
    size(): number
    push_back(n: T): any
    resize(count: number, value?: T): void
}

export declare class RectVector extends Rect implements Vector<Rect> {
    get(i: number): Rect
    isAliasOf(...a: any[]): any
    clone(...a: any[]): any
    delete(...a: any[]): any
    isDeleted(...a: any[]): any
    deleteLater(...a: any[]): any
    set(i: number, t: Rect): void
    put(i: number, j: number, data: any): any
    size(): number
    push_back(n: Rect): void
    resize(count: number, value?: Rect | undefined): void
    delete(): void
}