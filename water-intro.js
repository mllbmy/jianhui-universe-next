import * as THREE from './assets/vendor/three.module.min.js';

// A separate, persistent underwater scene. The universe is revealed only on entry.
export function createWaterIntro(renderer){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100);
 camera.position.z=28;
 const state={exit:0,age:0},point=new THREE.Vector2(),target=new THREE.Vector2();let energy=0,lastTime=0,lastX=0,lastY=0,imageReady=false,disposed=false;
 const placeholder=new THREE.DataTexture(new Uint8Array([3,14,26,255]),1,1);placeholder.needsUpdate=true;
 const uniforms={uTime:{value:0},uBirth:{value:0},uAspect:{value:innerWidth/innerHeight},uOpacity:{value:1},uPointer:{value:point},uEnergy:{value:0},uScale:{value:innerHeight*renderer.getPixelRatio()},uImage:{value:placeholder},uImageAspect:{value:16/9},uReady:{value:0}};
 // Reuse the already fetched responsive poster instead of downloading the same image again.
 const poster=document.querySelector('#entry-image');
 const usePoster=()=>{if(disposed||imageReady||!poster?.naturalWidth)return;const texture=new THREE.Texture(poster);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());uniforms.uImageAspect.value=poster.naturalWidth/poster.naturalHeight;uniforms.uImage.value=texture;imageReady=true;};
 if(poster?.complete)usePoster();else poster?.addEventListener('load',usePoster,{once:true});
 const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}float cloud(vec2 p){return noise(p)*.55+noise(p*2.1)*.28+noise(p*4.3)*.17;}`;
 const background=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.999,1.);}`,fragmentShader:`
 varying vec2 vUv;uniform float uTime,uBirth,uAspect,uOpacity,uEnergy,uReady,uImageAspect;uniform vec2 uPointer;uniform sampler2D uImage;${noise}
 void main(){vec2 uv=vUv;float t=uTime*.15;float depth=1.15-uv.y;float source=.32+sin(t*.5)*.018;
 float drift=sin(depth*4.+t)*.018+sin(depth*9.-t*.7)*.008;float rayX=(uv.x-source-drift)/(depth+.17);
 float shafts=0.;for(int i=0;i<11;i++){float k=float(i);float lane=(k-5.)*.115+sin(k*2.3+t*.4)*.028;float width=(.024+.025*(.5+.5*sin(k*3.)))*(1.+depth*.2);lane+=sin(depth*6.+k*2.+t)*.012;float ray=exp(-pow((rayX-lane)/width,2.));shafts+=ray*(.12+.20*noise(vec2(k,t*.3)))*exp(-depth*.65);}
 float broad=exp(-pow(rayX/.52,2.))*.23;float cloudiness=cloud(vec2(uv.x*5.+t*.1,uv.y*3.-t*.13));
 vec3 color=mix(vec3(.005,.022,.042),vec3(.018,.085,.145),uv.y*.65+cloudiness*.2);
 color+=vec3(.10,.29,.47)*(shafts+broad)*(0.7+cloudiness*.5);
 vec2 sun=(uv-vec2(source,1.06))*vec2(1.1,.7);float bloom=exp(-dot(sun,sun)*26.);color+=vec3(.24,.48,.65)*bloom*.8;
 float plume=exp(-pow((uv.x-(.30+sin(uv.y*5.+t)*.045))/.17,2.));color+=vec3(.025,.09,.15)*plume*cloudiness;
 vec2 pointerUv=uPointer/vec2(23.2*uAspect,23.2)+.5;float touch=exp(-length((uv-pointerUv)*vec2(uAspect,1.))*7.)*uEnergy;color+=vec3(.015,.06,.09)*touch;
 color*=.82+.18*smoothstep(0.,.25,uv.y);
 vec2 crop=vec2(min(1.,uAspect/uImageAspect),min(1.,uImageAspect/uAspect));
 float center=mix(.36,.5,smoothstep(.75,1.35,uAspect));vec2 imageUv=(uv-.5)*crop*.96+vec2(center,.5);
 // A travelling displacement field makes the pictured veil billow in water.
 float flowTime=uTime*.27;float curtain=exp(-pow((imageUv.x-.34)/.29,2.));
 imageUv.x+=(sin(imageUv.y*8.+flowTime)*.007+sin(imageUv.y*17.-flowTime*.7)*.003)*curtain;
 imageUv.y+=(sin(imageUv.x*10.-flowTime)*.004+sin(imageUv.y*7.+flowTime*.5)*.004)*curtain;
 vec2 cursor=(uv-pointerUv)*vec2(uAspect,1.);float wake=exp(-dot(cursor,cursor)*17.)*uEnergy;
 imageUv+=vec2(cursor.x-cursor.y*.7,cursor.y+cursor.x*.7)*wake*.042*crop;
 vec3 sampleColor=texture2D(uImage,clamp(imageUv,vec2(.002),vec2(.998))).rgb;
 float imageDepth=dot(sampleColor,vec3(.2126,.7152,.0722));imageUv+=uPointer/vec2(23.2*uAspect,23.2)*crop*(.005+imageDepth*.01);
 vec3 picture=texture2D(uImage,clamp(imageUv,vec2(.002),vec2(.998))).rgb;
 // Two continuously advected fields hand over before each cycle resets.
 float phaseA=fract(uTime*.105),phaseB=fract(phaseA+.5);float weightA=1.-abs(phaseA*2.-1.);
 vec2 current=vec2(sin(imageUv.y*8.-uTime*.32)*.048,.34);
 vec2 uvA=imageUv+current*(phaseA-.5),uvB=imageUv+current*(phaseB-.5);
 uvA.x+=sin(uvA.y*10.-uTime*.55)*.012*curtain;uvB.x+=sin(uvB.y*10.-uTime*.55)*.012*curtain;
 vec3 movingA=texture2D(uImage,clamp(uvA,vec2(.002),vec2(.998))).rgb;
 vec3 movingB=texture2D(uImage,clamp(uvB,vec2(.002),vec2(.998))).rgb;
 vec3 travelling=mix(movingB,movingA,weightA)*1.06;
 float flowingVeil=curtain*.96*smoothstep(.01,.16,imageUv.y)*(1.-smoothstep(.86,1.,imageUv.y));
 picture=mix(picture,travelling,flowingVeil);
 picture*=.98+.02*sin(uTime*.36+imageUv.y*4.);
 float front=clamp(uBirth,0.,1.)*1.22-.12;
 float depthMask=1.-uv.y+sin(uv.x*10.+uTime*.35)*.012+sin(uv.x*21.-uTime*.24)*.006;
 float reveal=1.-smoothstep(front-.075,front+.075,depthMask);
 color=mix(color,picture,uReady*reveal);
 float leadingLight=exp(-pow((depthMask-front)/.055,2.))*(1.-smoothstep(.90,1.,uBirth));
 color+=vec3(.025,.09,.15)*leadingLight*uReady;

 gl_FragColor=vec4(color,uOpacity);
 #include <colorspace_fragment>
 }
 `}));background.frustumCulled=false;background.renderOrder=-100;scene.add(background);
 let seed=9182;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 const narrow=innerWidth<701,count=narrow?14500:29000,positions=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count),types=new Float32Array(count);
 for(let k=0;k<count;k++){const type=k<90?2:k<count*.17?1:0;types[k]=type;const x=type===0?(rand()+rand()+rand()-1.5)*2/1.5:rand()*2-1;positions.set([x,rand()*36-18,type===2?7+rand()*8:type===1?-15+rand()*20:-5+rand()*8],k*3);seeds[k]=rand();sizes[k]=type===2?.45+rand()*1.1:type===1?.025+rand()*.05:.025+Math.pow(rand(),4)*.16;}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));geometry.setAttribute('aType',new THREE.BufferAttribute(types,1));
 const particles=new THREE.Points(geometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`
 attribute float aSize,aSeed,aType;uniform float uTime,uBirth,uAspect,uScale,uEnergy;uniform vec2 uPointer;varying float vAlpha,vType,vLight;
 void main(){float t=uTime;vec3 p=position;float velocity=aType<.5?(.58+aSeed*.58):(.12+aSeed*.18);float wrap=mod(p.y+18.-t*velocity,36.)-18.;p.y=wrap;float flow=sin(wrap*.22+t*.14)*3.1+sin(wrap*.51-t*.11)*1.1;float span=min(uAspect,2.2)/1.6;
 if(aType<.5){float ribbon=sin(wrap*.66+floor(aSeed*24.)*.38-t*.42)*1.05;float spread=3.2+sin(wrap*.26-t*.08)*.9;p.x=(position.x*spread-5.1+flow+ribbon)*span;p.z+=sin(wrap*.21+t*.22+aSeed*9.)*.65;}
 else{p.x=position.x*14.*uAspect+sin(wrap*.14+t*.12+aSeed*6.)*.7;p.y+=sin(t*.22+aSeed*12.)*.35;}
 vec2 delta=p.xy-uPointer;float force=exp(-dot(delta,delta)/5.)*uEnergy;vec2 direction=normalize(delta+vec2(.001));p.xy+=(direction*1.1+vec2(-direction.y,direction.x)*.85)*force;p.z+=force*.65;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uScale*1.25/max(1.,-mv.z),.65,aType>1.5?100.:9.);
 vAlpha=(aType>1.5?.15:aType>.5?.35:.72)*smoothstep(-18.,-13.,wrap)*(1.-smoothstep(13.,18.,wrap));vAlpha*=smoothstep(18.-uBirth*38.-2.,18.-uBirth*38.+1.,wrap);vLight=.6+.4*sin(aSeed*91.+t*.4);vType=aType;}
 `,fragmentShader:`uniform float uOpacity;varying float vAlpha,vType,vLight;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float alpha;vec3 color;if(vType>1.5){alpha=exp(-r*r*4.)*(1.-smoothstep(.5,1.,r));color=vec3(.28,.65,.92);}else{alpha=exp(-r*r*16.)+pow(1.-r,3.)*.28;color=mix(vec3(.25,.58,.85),vec3(.80,.94,1.),vLight);}gl_FragColor=vec4(color,alpha*vAlpha*uOpacity);}`}));particles.frustumCulled=false;scene.add(particles);
 return {scene,camera,state,complete(){state.age=Math.max(state.age,4.8);},resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();uniforms.uAspect.value=camera.aspect;uniforms.uScale.value=innerHeight*renderer.getPixelRatio();},update(time,pointer,reduced){
  const dt=lastTime===0?0:Math.min(.06,Math.max(0,time-lastTime));lastTime=time;if(reduced)state.age=4.8;else if(imageReady)state.age+=dt;uniforms.uBirth.value=Math.min(1,state.age/4.8);target.set(pointer.x*23.2*camera.aspect,pointer.y*23.2);const speed=Math.hypot(pointer.x-lastX,pointer.y-lastY);lastX=pointer.x;lastY=pointer.y;const wanted=reduced?0:Math.min(1,speed*85);energy+=(wanted-energy)*(1-Math.exp(-Math.max(dt,.016)*4));point.lerp(target,.065);uniforms.uTime.value=reduced?0:state.age;uniforms.uEnergy.value=energy;uniforms.uOpacity.value=1-state.exit;if(imageReady)uniforms.uReady.value=reduced?1:Math.min(1,uniforms.uReady.value+.05);camera.position.set(reduced?0:pointer.x*.3,reduced?0:pointer.y*.2,28-state.exit*8);camera.lookAt(0,0,0);
 },info(){return {particles:count,sourceImage:true,restored:true,age:state.age,arrival:Math.min(1,state.age/4.8),interaction:energy,exit:state.exit,imageReady};},dispose(){disposed=true;uniforms.uImage.value.dispose();if(uniforms.uImage.value!==placeholder)placeholder.dispose();geometry.dispose();particles.material.dispose();background.geometry.dispose();background.material.dispose();}};
}
