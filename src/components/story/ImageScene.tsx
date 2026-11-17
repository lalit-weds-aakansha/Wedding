/**
 * A full-screen scene made from a picture file (`public/images/story/*.jpg`, 1536 x 2304). The picture always fills the whole screen
 * (no blurred sides): on tall phone screens it shows whole, on wide screens it is enlarged to the screen's width and the band with the couple is kept (`focus` is the vertical position, in %, so the faces sit below the card).
 */
export function ImageScene({ src, alt, focus = 60 }: { src: string; alt: string; cover?: boolean; focus?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#2a2230]">
      <img src={src} alt={alt} decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `50% ${focus}%` }} />
    </div>
  );
}
