import * as THREE from './assets/vendor/three.module.min.js';

// A separate, persistent underwater scene. The universe is revealed only on entry.
export function createWaterIntro(renderer){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,240);
 camera.position.z=28;
 const state={exit:0,age:0},point=new THREE.Vector2(),target=new THREE.Vector2();let energy=0,lastTime=0,lastX=0,lastY=0,imageReady=false,disposed=false;
 const placeholder=new THREE.DataTexture(new Uint8Array([3,14,26,255]),1,1);placeholder.needsUpdate=true;
 const uniforms={uTime:{value:0},uMorph:{value:0},uPhoto:{value:0},uLayer:{value:0},uLayerStrength:{value:1},uOverscan:{value:4.2},uAspect:{value:innerWidth/innerHeight},uOpacity:{value:1},uPointer:{value:point},uEnergy:{value:0},uScale:{value:innerHeight*renderer.getPixelRatio()},uImage:{value:placeholder},uImageAspect:{value:16/9},uReady:{value:0}};
 // Reuse the already fetched responsive poster instead of downloading the same image again.
 const poster=document.querySelector('#entry-image');
 const usePoster=()=>{if(disposed||imageReady||!poster?.naturalWidth)return;poster.width=poster.naturalWidth;poster.height=poster.naturalHeight;const texture=new THREE.Texture(poster);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());uniforms.uImageAspect.value=poster.naturalWidth/poster.naturalHeight;uniforms.uImage.value=texture;imageReady=true;};
 if(poster?.complete)usePoster();else poster?.addEventListener('load',usePoster,{once:true});
 const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}float cloud(vec2 p){return noise(p)*.55+noise(p*2.1)*.28+noise(p*4.3)*.17;}`;
 const waterField='uniform float uTime,uAspect,uImageAspect,uEnergy;uniform vec2 uPointer;uniform sampler2D uImage;\nvec3 waterAt(vec2 uv){vec2 pointerUv=uPointer/vec2(23.2*uAspect,23.2)+.5;\n vec2 crop=vec2(min(1.,uAspect/uImageAspect),min(1.,uImageAspect/uAspect));\n float center=mix(.36,.5,smoothstep(.75,1.35,uAspect));vec2 imageUv=(uv-.5)*crop*.96+vec2(center,.5);\n // A travelling displacement field makes the pictured veil billow in water.\n float flowTime=uTime*.27;float curtain=exp(-pow((imageUv.x-.34)/.29,2.));\n imageUv.x+=(sin(imageUv.y*8.+flowTime)*.007+sin(imageUv.y*17.-flowTime*.7)*.003)*curtain;\n imageUv.y+=(sin(imageUv.x*10.-flowTime)*.004+sin(imageUv.y*7.+flowTime*.5)*.004)*curtain;\n vec2 cursor=(uv-pointerUv)*vec2(uAspect,1.);float wake=exp(-dot(cursor,cursor)*17.)*uEnergy;\n imageUv+=vec2(cursor.x-cursor.y*.7,cursor.y+cursor.x*.7)*wake*.042*crop;\n vec3 sampleColor=texture2D(uImage,clamp(imageUv,vec2(.002),vec2(.998))).rgb;\n float imageDepth=dot(sampleColor,vec3(.2126,.7152,.0722));imageUv+=uPointer/vec2(23.2*uAspect,23.2)*crop*(.005+imageDepth*.01);\n vec3 picture=texture2D(uImage,clamp(imageUv,vec2(.002),vec2(.998))).rgb;\n // Two continuously advected fields hand over before each cycle resets.\n float phaseA=fract(uTime*.105),phaseB=fract(phaseA+.5);float weightA=1.-abs(phaseA*2.-1.);\n vec2 current=vec2(sin(imageUv.y*8.-uTime*.32)*.048,.34);\n vec2 uvA=imageUv+current*(phaseA-.5),uvB=imageUv+current*(phaseB-.5);\n uvA.x+=sin(uvA.y*10.-uTime*.55)*.012*curtain;uvB.x+=sin(uvB.y*10.-uTime*.55)*.012*curtain;\n vec3 movingA=texture2D(uImage,clamp(uvA,vec2(.002),vec2(.998))).rgb;\n vec3 movingB=texture2D(uImage,clamp(uvB,vec2(.002),vec2(.998))).rgb;\n vec3 travelling=mix(movingB,movingA,weightA)*1.06;\n float flowingVeil=curtain*.96*smoothstep(.01,.16,imageUv.y)*(1.-smoothstep(.86,1.,imageUv.y));\n picture=mix(picture,travelling,flowingVeil);\n picture*=.98+.02*sin(uTime*.36+imageUv.y*4.);\n\nreturn picture;}';
 const background=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.9999,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uPhoto,uOpacity;${waterField}void main(){gl_FragColor=vec4(waterAt(vUv),uPhoto*uOpacity);
#include <colorspace_fragment>
}
`}));background.frustumCulled=false;background.renderOrder=-100;background.position.z=-8;scene.add(background);
 // An unbounded water atmosphere keeps oblique views free of card edges.
 const atmosphere=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.9999,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime,uOpacity;void main(){vec2 p=vUv;float t=uTime*.12;float light=exp(-pow((p.x-.25)/(.4+(1.-p.y)*.3),2.))*pow(p.y,1.8);float haze=.5+.5*sin(p.x*3.+p.y*4.+t);vec3 c=vec3(.003,.017,.032)+vec3(.015,.065,.10)*light+vec3(.001,.006,.012)*haze;gl_FragColor=vec4(c,uOpacity);}`}));atmosphere.frustumCulled=false;atmosphere.renderOrder=-110;scene.add(atmosphere);
 // Parallel image cards at two depths, with point sprites in front: a 2.5D stage.
 const veilMaterial=background.material.clone();veilMaterial.uniforms={...uniforms,uLayer:{value:1}};
 const veil=new THREE.Mesh(background.geometry,veilMaterial);veil.position.z=1;veil.renderOrder=-90;veil.frustumCulled=false;scene.add(veil);
 const cameraStage={progress:0,yaw:0,farX:0,midX:0},farProbe=new THREE.Vector3(),midProbe=new THREE.Vector3();
 function fitCards(){for(const card of [background,veil]){const h=2*Math.tan(Math.PI/8)*(28-card.position.z)*uniforms.uOverscan.value;card.scale.set(h*camera.aspect/2,h/2,1);}}
 fitCards();
 let seed=9182;const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 const narrow=innerWidth<701,count=narrow?56000:128000,positions=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count),types=new Float32Array(count);
 for(let k=0;k<count;k++){const type=k<90?2:k<count*.02?1:0;types[k]=type;
  positions.set(type===0?[rand(),rand(),rand()*2-1]:[rand()*2-1,rand()*36-18,rand()*35-20],k*3);
  seeds[k]=rand();sizes[k]=type===2?.45+rand()*1.1:.025+Math.pow(rand(),4)*.16;
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));geometry.setAttribute('aType',new THREE.BufferAttribute(types,1));
 const particles=new THREE.Points(geometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`
 attribute float aSize,aSeed,aType;uniform float uScale,uPhoto;varying float vAlpha,vType;varying vec3 vColor;${waterField}
 void main(){vec3 p;vType=aType;
  if(aType<.5){
   vec2 flowUv=vec2(position.x,fract(position.y-uTime*(.012+aSeed*.004)));
   flowUv.x+=sin(flowUv.y*13.+aSeed*7.+uTime*.18)*.0015;
   vec3 color=waterAt(flowUv);float light=dot(color,vec3(.2126,.7152,.0722));
   float z=position.z*4.5+sin(flowUv.y*7.+position.x*9.)*2.2+light*4.;
   float h=.41421356237*(28.-z);
   p=vec3((flowUv.x*2.-1.)*h*uAspect,(flowUv.y*2.-1.)*h,z);
   vColor=color;vAlpha=smoothstep(.004,.16,light)*(.7+.3*aSeed)*(1.-uPhoto)*smoothstep(0.,.025,flowUv.y)*(1.-smoothstep(.975,1.,flowUv.y));
   vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
   gl_PointSize=clamp(uScale*${narrow?'0.0068':'0.0046'}*(28.-z)/max(1.,-mv.z),.8,10.);
  }else{
   float y=mod(position.y+18.-uTime*(.12+aSeed*.18),36.)-18.;
   p=vec3(position.x*22.*min(uAspect,1.8)+sin(uTime*.18+aSeed*7.)*.3,y,position.z);
   vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
   gl_PointSize=clamp(aSize*uScale/max(1.,-mv.z),1.,aType>1.5?75.:5.);
   vColor=vec3(.18,.48,.8);vAlpha=(aType>1.5?.15:.3)*smoothstep(-18.,-13.,y)*(1.-smoothstep(13.,18.,y));
  }
 }
 `,fragmentShader:`uniform float uOpacity;varying float vAlpha,vType;varying vec3 vColor;
 void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=exp(-r*r*4.5)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(vColor,a*vAlpha*uOpacity);
 #include <colorspace_fragment>
 }`}));particles.frustumCulled=false;scene.add(particles);
 return {scene,camera,state,complete(){state.age=Math.max(state.age,5.6);},resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();uniforms.uAspect.value=camera.aspect;uniforms.uScale.value=innerHeight*renderer.getPixelRatio();fitCards();},update(time,pointer,reduced){
  const dt=lastTime===0?0:Math.min(.06,Math.max(0,time-lastTime));lastTime=time;if(reduced)state.age=5.6;else if(imageReady)state.age+=dt;target.set(pointer.x*23.2*camera.aspect,pointer.y*23.2);const speed=Math.hypot(pointer.x-lastX,pointer.y-lastY);lastX=pointer.x;lastY=pointer.y;const wanted=reduced?0:Math.min(1,speed*85);energy+=(wanted-energy)*(1-Math.exp(-Math.max(dt,.016)*4));point.lerp(target,.065);uniforms.uTime.value=reduced?0:state.age;uniforms.uEnergy.value=energy;uniforms.uOpacity.value=1-state.exit;if(imageReady)uniforms.uReady.value=1;
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
  const progress=Math.min(1,state.age/5.6),e=smooth(state.age/4.5),remaining=1-e;
  const morph=0,photo=smooth((state.age-3.7)/1.9);
  const span=Math.min(1,Math.max(.65,camera.aspect/1.55));
  const angle=110*Math.PI/180*remaining,radius=28+5*Math.sin(Math.PI*e);
  const targetX=-4.2*span*remaining,targetY=0;
  camera.position.set(targetX+Math.sin(angle)*radius,3.5*Math.sin(Math.PI*e),Math.cos(angle)*radius-state.exit*8);
  camera.lookAt(targetX,targetY,0);camera.updateMatrixWorld();
  // The cloud loosens before the image appears; the final dolly continues through the handover.
  uniforms.uMorph.value=morph;uniforms.uPhoto.value=photo;uniforms.uLayerStrength.value=1-e;veil.visible=false;
  background.visible=imageReady&&photo>0;
  farProbe.set(0,0,background.position.z).project(camera);midProbe.set(0,0,veil.position.z).project(camera);
  Object.assign(cameraStage,{progress,orbit:110*remaining,yaw:Math.atan2(camera.position.x-targetX,camera.position.z)*180/Math.PI,farX:farProbe.x,midX:midProbe.x});
 },info(){return {variant:"3d-volume",alignedProjection:true,particles:count,sourceImage:true,restored:true,age:state.age,arrival:cameraStage.progress,labelReady:state.age>=5.05,photoReveal:uniforms.uPhoto.value,morph:uniforms.uMorph.value,orbitDegrees:cameraStage.orbit,camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw:cameraStage.yaw,roll:camera.rotation.z*180/Math.PI},layers:[{depth:background.position.z,screenX:cameraStage.farX},{depth:veil.position.z,screenX:cameraStage.midX},{depth:12}],interaction:energy,exit:state.exit,imageReady};},dispose(){disposed=true;uniforms.uImage.value.dispose();if(uniforms.uImage.value!==placeholder)placeholder.dispose();geometry.dispose();particles.material.dispose();background.geometry.dispose();background.material.dispose();veil.material.dispose();atmosphere.geometry.dispose();atmosphere.material.dispose();}};
}
