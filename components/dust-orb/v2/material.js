/* Dust v2: advected folds, depth extinction and a moving ember. */
window.DustMaterial={vertex:`
precision highp float;
precision highp sampler3D;
uniform mat4 modelViewMatrix,projectionMatrix;
uniform sampler3D uNoise;
uniform float uTime,uEnergy,uLight,uRatio,uDensity,uGas,uPulse,uVoice,uAttention,uCameraZ;
uniform vec4 uModes;
uniform vec2 uPointer,uRotate,uLampTarget,uTrail;
in vec3 position;
in vec4 aSeed;
out vec3 vColor;
out float vAlpha,vGas;
const float TAU=6.28318530718;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec3 flow(vec3 p,float t){return vec3(sin(p.z+t*.21)+cos(p.y-t*.17),sin(p.x-t*.18)+cos(p.z+t*.14),sin(p.y+t*.13)+cos(p.x-t*.16))*.5;}
void main(){
 float t=uTime,listen=uModes.x,think=uModes.y,speak=uModes.z,alert=uModes.w;
 vec3 q=position;
 vec3 n=texture(uNoise,q*.15+vec3(t*.005,-t*.008,t*.006)).rgb*2.-1.;
 vec3 fine=texture(uNoise,q*.43+n*.09+vec3(-t*.009,t*.004,t*.006)).rgb*2.-1.;
 float breath=sin(t*.61)*.018+sin(t*.23+1.1)*.011;
 float voice=uVoice*speak;
 // Every seed follows a continuous sheet. State changes alter its flow, not its identity.
 float fold=sin(q.y*5.4+q.z*2.9+n.x*3.+t*.19)*cos(q.x*3.9+n.y*2.-t*.13);
 float drift=sin(q.z*3.5+q.y*2.1+t*.31);
 vec3 p=q*(1.+breath+fold*.13+n.x*.13+uPulse*.12+voice*.07);
 p+=flow(q*1.55,t)*(.15+uEnergy*.13+alert*.12)+fine*.045;
 p.xz=rot(q.y*(.16+think*.23)+sin(t*.23+q.z)*.07)*p.xz;
 p.y+=drift*(.04+think*.07);
 float fringe=smoothstep(.88,1.,aSeed.w);
 p+=normalize(q)*fringe*(.08+.065*sin(t*.37+aSeed.x*TAU));
 p.xz=rot(t*.024+uRotate.x)*p.xz;
 p.yz=rot(.08*sin(t*.14)+uRotate.y)*p.yz;
 // Camera-plane interaction stays under the pointer even after dragging the cloud.
 // Only the nearby folds stretch; the core retains its volume.
 vec2 aim=uPointer*(uCameraZ-p.z)/uCameraZ;
 vec2 delta=aim-p.xy;
 float influence=exp(-dot(delta,delta)*2.5)*uAttention;
 float surface=smoothstep(.35,1.12,length(p.xy));
 vec2 outward=uPointer/max(length(uPointer),.25);
 p.xy+=(delta*(.18+surface*.28)+outward*surface*.22)*influence;
 // Sparse outer grains lag behind the fold in narrow, curved ribbons.
 // Stable seeds prevent popping when the pointer reverses direction.
 vec2 lag=clamp(uTrail-uPointer,vec2(-.65),vec2(.65));
 float ribbon=pow(.5+.5*sin(q.z*23.+q.y*9.),12.);
 float filament=fringe*ribbon*influence;
 p.xy+=(outward*.28+delta*.16)*filament+lag*filament*(.65+aSeed.y*.5);
 p.z+=sin(aSeed.y*3.14159)*filament*.12;
 // Light is inside the cloud. The front-facing folds stay partly in shadow.
 vec3 lamp=vec3(-.30+.19*sin(t*.33),-.13+.14*cos(t*.26),.06);
 lamp.xy=mix(lamp.xy,uLampTarget*.52,uAttention*.86);
 float d=length((p-lamp)*vec3(1.1,.86,1.));
 float heat=exp(-d*d*2.7);
 float channel=.5+.5*sin(q.y*6.5+q.x*2.7+fold*2.9-t*(.5+think*.8));
 float veins=pow(channel,8.)*exp(-d*d*1.25);
 float front=smoothstep(-1.3,1.4,p.z);
 float shadow=.24+.76*smoothstep(-.7,.75,fold+n.y*.75);
 float rim=pow(1.-abs(normalize(p).z),2.5);
 float pulseWave=exp(-pow((length(p)-uPulse*1.9)*4.,2.))*uPulse;
 vec3 ash=mix(vec3(.12,.17,.20),vec3(.47,.58,.61),front);
 ash*=shadow*(.44+rim*.7);
 vec3 ember=mix(vec3(1.,.24,.055),vec3(.66,.77,.92),listen*.68);
 ember=mix(ember,vec3(1.,.43,.10),think*.32);
 ember=mix(ember,vec3(1.,.13,.035),alert*.7);
 float flicker=.88+.07*sin(t*1.8+sin(t*.7))+.025*sin(t*5.2);
 float power=uLight*(1.+voice*.9+alert*.45)*flicker;
 vColor=ash+ember*(heat*1.35+veins*.38+pulseWave*.4)*power;
 vColor+=vec3(.23,.39,.44)*rim*.16;
 vColor+=vec3(.40,.54,.58)*influence*(surface*.07+filament*.26);
 float grain=mix(.95,1.95,aSeed.z*aSeed.z);
 vAlpha=(.32+aSeed.y*.23)*mix(.32,1.,front)*(1.-fringe*.76)*uDensity;
 // A few lit grains make the sharp surface readable without whitening the cloud.
 if(aSeed.z>.982){grain*=1.2;vColor+=vec3(.54,.45,.31)*heat*power;}
 if(uGas>.5){
  grain=mix(25.,48.,aSeed.z);
  vColor=ember*heat*power*2.7;
  vAlpha=.065*(.4+shadow*.6);
 }
 vColor=pow(max(vColor,vec3(0.)),vec3(.48));
 vec4 mv=modelViewMatrix*vec4(p,1.);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(grain*uRatio*(4.8/-mv.z),uGas>.5?3.:.65,uGas>.5?44.:3.);
 vGas=uGas;
}`,fragment:`
precision highp float;
in vec3 vColor;
in float vAlpha,vGas;
out vec4 outColor;
void main(){
 vec2 uv=gl_PointCoord*2.-1.;float r=dot(uv,uv);if(r>1.)discard;
 float mask=vGas>.5?exp(-r*4.)*(1.-smoothstep(.6,1.,r)):1.-smoothstep(.05,1.,r);
 outColor=vec4(vColor,vAlpha*mask);
}`};
