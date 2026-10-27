'use strict';
// Work in physical pixels until occlusion is resolved. Convert each clipped edge
// into the DIP coordinate system of its own display only afterwards.
function edges(windows, bounds) {
  const out=[];
  for(let i=0;i<windows.length;i++) {
    const w=windows[i],r=w.r,y=r[1];if(!w.perch||y<bounds.y-2||y>bounds.y+bounds.height-48)continue;
    let segments=[[Math.max(r[0]+10,bounds.x),Math.min(r[2]-10,bounds.x+bounds.width)]];
    for(let j=0;j<i;j++) {
      const a=windows[j].r;
      if(a[1]<=y+3&&a[3]>y-3)segments=segments.flatMap(([l,r])=>{
        if(a[2]<=l||a[0]>=r)return [[l,r]];
        const s=[];if(a[0]>l)s.push([l,a[0]-8]);if(a[2]<r)s.push([a[2]+8,r]);return s;
      });
    }
    // IDs are based on the owning window + physical edge origin. Width changes
    // and occlusion changes invalidate perches and release their occupants.
    for(const [l,end] of segments)if(end-l>=32)out.push({id:w.id+':'+Math.round(l-w.r[0]),x:l,y,w:end-l,h:w.r[3]-y});
  }return out;
}
function isFullscreen(r,b){return !!r&&Math.abs(r[0]-b.x)<=2&&Math.abs(r[1]-b.y)<=2&&Math.abs(r[2]-b.x-b.width)<=2&&Math.abs(r[3]-b.y-b.height)<=2;}
module.exports={edges,isFullscreen};
