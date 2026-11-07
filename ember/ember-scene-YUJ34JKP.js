import{$ as Go,B as Oe,C as lt,D as Ia,E as ct,F as ao,G as Ht,H as oe,I as Na,J as so,K as ja,L as V,M as Ga,N as Io,O as qe,P as ro,Q as Za,R as io,S as ie,T as no,U as qa,V as Wa,W as Ya,X as Ka,Y as Xa,Z as No,_ as jo,a as Je,aa as Zo,b as et,ba as qo,c as Aa,ca as Wo,d as to,da as ee,e as ka,ea as _e,f as Ca,fa as Qa,g as zo,ga as $a,h as Bo,ha as Ja,i as Uo,ia as Yo,j as Fa,ja as es,k as Rt,ka as Ko,l as La,la as ts,m as Oo,ma as ke,n as Dt,na as os,o as za,oa as as,p as Ba,pa as ht,q as Ae,qa as ss,r as oo,ra as lo,s as Ua,t as Oa,u as Vo,v as Va,w as re,x as _,y as nt,z as w}from"./ember-chunk-G43SKIYH.js";import"./ember-chunk-LNKPV2WA.js";var rs={type:"change"},Qo={type:"start"},ns={type:"end"},co=new Za,is=new ro,Ys=Math.cos(70*re.DEG2RAD),W=new w,ne=2*Math.PI,D={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Xo=1e-6,ho=class extends ts{constructor(e,a=null){super(e,a),this.state=D.NONE,this.target=new w,this.cursor=new w,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Je.ROTATE,MIDDLE:Je.DOLLY,RIGHT:Je.PAN},this.touches={ONE:et.ROTATE,TWO:et.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new w,this._lastQuaternion=new nt,this._lastTargetPosition=new w,this._quat=new nt().setFromUnitVectors(e.up,new w(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ko,this._sphericalDelta=new Ko,this._scale=1,this._panOffset=new w,this._rotateStart=new _,this._rotateEnd=new _,this._rotateDelta=new _,this._panStart=new _,this._panEnd=new _,this._panDelta=new _,this._dollyStart=new _,this._dollyEnd=new _,this._dollyDelta=new _,this._dollyDirection=new w,this._mouse=new _,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Xs.bind(this),this._onPointerDown=Ks.bind(this),this._onPointerUp=Qs.bind(this),this._onContextMenu=sr.bind(this),this._onMouseWheel=er.bind(this),this._onKeyDown=tr.bind(this),this._onTouchStart=or.bind(this),this._onTouchMove=ar.bind(this),this._onMouseDown=$s.bind(this),this._onMouseMove=Js.bind(this),this._interceptControlDown=rr.bind(this),this._interceptControlUp=ir.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=D.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(rs),this.update(),this.state=D.NONE}pan(e,a){this._pan(e,a),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let a=this.object.position;W.copy(a).sub(this.target),W.applyQuaternion(this._quat),this._spherical.setFromVector3(W),this.autoRotate&&this.state===D.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let s=this.minAzimuthAngle,n=this.maxAzimuthAngle;isFinite(s)&&isFinite(n)&&(s<-Math.PI?s+=ne:s>Math.PI&&(s-=ne),n<-Math.PI?n+=ne:n>Math.PI&&(n-=ne),s<=n?this._spherical.theta=Math.max(s,Math.min(n,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(s+n)/2?Math.max(s,this._spherical.theta):Math.min(n,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(W.setFromSpherical(this._spherical),W.applyQuaternion(this._quatInverse),a.copy(this.target).add(W),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){let p=W.length();c=this._clampDistance(p*this._scale);let u=p-c;this.object.position.addScaledVector(this._dollyDirection,u),this.object.updateMatrixWorld(),l=!!u}else if(this.object.isOrthographicCamera){let p=new w(this._mouse.x,this._mouse.y,0);p.unproject(this.object);let u=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=u!==this.object.zoom;let g=new w(this._mouse.x,this._mouse.y,0);g.unproject(this.object),this.object.position.sub(g).add(p),this.object.updateMatrixWorld(),c=W.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(co.origin.copy(this.object.position),co.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(co.direction))<Ys?this.object.lookAt(this.target):(is.setFromNormalAndCoplanarPoint(this.object.up,this.target),co.intersectPlane(is,this.target))))}else if(this.object.isOrthographicCamera){let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>Xo||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Xo||this._lastTargetPosition.distanceToSquared(this.target)>Xo?(this.dispatchEvent(rs),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ne/60*this.autoRotateSpeed*e:ne/60/60*this.autoRotateSpeed}_getZoomScale(e){let a=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*a)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,a){W.setFromMatrixColumn(a,0),W.multiplyScalar(-e),this._panOffset.add(W)}_panUp(e,a){this.screenSpacePanning===!0?W.setFromMatrixColumn(a,1):(W.setFromMatrixColumn(a,0),W.crossVectors(this.object.up,W)),W.multiplyScalar(e),this._panOffset.add(W)}_pan(e,a){let s=this.domElement;if(this.object.isPerspectiveCamera){let n=this.object.position;W.copy(n).sub(this.target);let l=W.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/s.clientHeight,this.object.matrix),this._panUp(2*a*l/s.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/s.clientWidth,this.object.matrix),this._panUp(a*(this.object.top-this.object.bottom)/this.object.zoom/s.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,a){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let s=this.domElement.getBoundingClientRect(),n=e-s.left,l=a-s.top,c=s.width,p=s.height;this._mouse.x=n/c*2-1,this._mouse.y=-(l/p)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientY),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let a=this.domElement;this._rotateLeft(ne*this._rotateDelta.x/a.clientHeight),this._rotateUp(ne*this._rotateDelta.y/a.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let a=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ne*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),a=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ne*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),a=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ne*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),a=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ne*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),a=!0;break}a&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let a=this._getSecondPointerPosition(e),s=.5*(e.pageX+a.x),n=.5*(e.pageY+a.y);this._rotateStart.set(s,n)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let a=this._getSecondPointerPosition(e),s=.5*(e.pageX+a.x),n=.5*(e.pageY+a.y);this._panStart.set(s,n)}}_handleTouchStartDolly(e){let a=this._getSecondPointerPosition(e),s=e.pageX-a.x,n=e.pageY-a.y,l=Math.sqrt(s*s+n*n);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let s=this._getSecondPointerPosition(e),n=.5*(e.pageX+s.x),l=.5*(e.pageY+s.y);this._rotateEnd.set(n,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let a=this.domElement;this._rotateLeft(ne*this._rotateDelta.x/a.clientHeight),this._rotateUp(ne*this._rotateDelta.y/a.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let a=this._getSecondPointerPosition(e),s=.5*(e.pageX+a.x),n=.5*(e.pageY+a.y);this._panEnd.set(s,n)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let a=this._getSecondPointerPosition(e),s=e.pageX-a.x,n=e.pageY-a.y,l=Math.sqrt(s*s+n*n);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let c=(e.pageX+a.x)*.5,p=(e.pageY+a.y)*.5;this._updateZoomParameters(c,p)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let a=0;a<this._pointers.length;a++)if(this._pointers[a]==e.pointerId){this._pointers.splice(a,1);return}}_isTrackingPointer(e){for(let a=0;a<this._pointers.length;a++)if(this._pointers[a]==e.pointerId)return!0;return!1}_trackPointer(e){let a=this._pointerPositions[e.pointerId];a===void 0&&(a=new _,this._pointerPositions[e.pointerId]=a),a.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let a=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[a]}_customWheelEvent(e){let a=e.deltaMode,s={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(a){case 1:s.deltaY*=16;break;case 2:s.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(s.deltaY*=10),s}};function Ks(t){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(t.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(t)&&(this._addPointer(t),t.pointerType==="touch"?this._onTouchStart(t):this._onMouseDown(t),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function Xs(t){this.enabled!==!1&&(t.pointerType==="touch"?this._onTouchMove(t):this._onMouseMove(t))}function Qs(t){switch(this._removePointer(t),this._pointers.length){case 0:this.domElement.releasePointerCapture(t.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(ns),this.state=D.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let e=this._pointers[0],a=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:a.x,pageY:a.y});break}}function $s(t){let e;switch(t.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Je.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(t),this.state=D.DOLLY;break;case Je.ROTATE:if(t.ctrlKey||t.metaKey||t.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(t),this.state=D.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(t),this.state=D.ROTATE}break;case Je.PAN:if(t.ctrlKey||t.metaKey||t.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(t),this.state=D.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(t),this.state=D.PAN}break;default:this.state=D.NONE}this.state!==D.NONE&&this.dispatchEvent(Qo)}function Js(t){switch(this.state){case D.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(t);break;case D.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(t);break;case D.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(t);break}}function er(t){this.enabled===!1||this.enableZoom===!1||this.state!==D.NONE||(t.preventDefault(),this.dispatchEvent(Qo),this._handleMouseWheel(this._customWheelEvent(t)),this.dispatchEvent(ns))}function tr(t){this.enabled!==!1&&this._handleKeyDown(t)}function or(t){switch(this._trackPointer(t),this._pointers.length){case 1:switch(this.touches.ONE){case et.ROTATE:if(this.enableRotate===!1){this.state=D.NONE;break}this._handleTouchStartRotate(t),this.state=D.TOUCH_ROTATE;break;case et.PAN:if(this.enablePan===!1){this.state=D.NONE;break}this._handleTouchStartPan(t),this.state=D.TOUCH_PAN;break;default:this.state=D.NONE}break;case 2:switch(this.touches.TWO){case et.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(t),this.state=D.TOUCH_DOLLY_PAN;break;case et.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(t),this.state=D.TOUCH_DOLLY_ROTATE;break;default:this.state=D.NONE}break;default:this.state=D.NONE}this.state!==D.NONE&&this.dispatchEvent(Qo)}function ar(t){switch(this._trackPointer(t),this.state){case D.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(t),this.update();break;case D.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(t),this.update();break;case D.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(t),this.update();break;case D.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(t),this.update();break;default:this.state=D.NONE}}function sr(t){this.enabled!==!1&&t.preventDefault()}function rr(t){t.key==="Control"&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function ir(t){t.key==="Control"&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var uo={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var ls={name:"LuminosityHighPassShader",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new oe(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var We=class t extends ss{constructor(e,a=1,s,n){super(),this.strength=a,this.radius=s,this.threshold=n,this.resolution=e!==void 0?new _(e.x,e.y):new _(256,256),this.clearColor=new oe(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let l=Math.round(this.resolution.x/2),c=Math.round(this.resolution.y/2);this.renderTargetBright=new lt(l,c,{type:Ae,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){let v=new lt(l,c,{type:Ae,depthBuffer:!1});v.texture.name="UnrealBloomPass.h"+h,v.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(v);let y=new lt(l,c,{type:Ae,depthBuffer:!1});y.texture.name="UnrealBloomPass.v"+h,y.texture.generateMipmaps=!1,this.renderTargetsVertical.push(y),l=Math.round(l/2),c=Math.round(c/2)}let p=ls;this.highPassUniforms=Wo.clone(p.uniforms),this.highPassUniforms.luminosityThreshold.value=n,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new ee({uniforms:this.highPassUniforms,vertexShader:p.vertexShader,fragmentShader:p.fragmentShader}),this.separableBlurMaterials=[];let u=[6,10,14,18,22];l=Math.round(this.resolution.x/2),c=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(u[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new _(1/l,1/c),l=Math.round(l/2),c=Math.round(c/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=a,this.compositeMaterial.uniforms.bloomRadius.value=.1;let g=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=g,this.bloomTintColors=[new w(1,1,1),new w(1,1,1),new w(1,1,1),new w(1,1,1),new w(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Wo.clone(uo.uniforms),this.blendMaterial=new ee({uniforms:this.copyUniforms,vertexShader:uo.vertexShader,fragmentShader:uo.fragmentShader,premultipliedAlpha:!0,blending:ka,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new oe,this._oldClearAlpha=1,this._basic=new io,this._fsQuad=new lo(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,a){let s=Math.round(e/2),n=Math.round(a/2);this.renderTargetBright.setSize(s,n);for(let l=0;l<this.nMips;l++)this.renderTargetsHorizontal[l].setSize(s,n),this.renderTargetsVertical[l].setSize(s,n),this.separableBlurMaterials[l].uniforms.invSize.value=new _(1/s,1/n),s=Math.round(s/2),n=Math.round(n/2)}render(e,a,s,n,l){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();let c=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),l&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=s.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=s.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let p=this.renderTargetBright;for(let u=0;u<this.nMips;u++)this._fsQuad.material=this.separableBlurMaterials[u],this.separableBlurMaterials[u].uniforms.colorTexture.value=p.texture,this.separableBlurMaterials[u].uniforms.direction.value=t.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[u]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[u].uniforms.colorTexture.value=this.renderTargetsHorizontal[u].texture,this.separableBlurMaterials[u].uniforms.direction.value=t.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[u]),e.clear(),this._fsQuad.render(e),p=this.renderTargetsVertical[u];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,l&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(s),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=c}_getSeparableBlurMaterial(e){let a=[],s=e/3;for(let c=0;c<e;c++)a.push(.39894*Math.exp(-.5*c*c/(s*s))/s);let n=[],l=[];for(let c=1;c<e;c+=2){let p=a[c],u=c+1<e?a[c+1]:0,g=p+u;n.push((c*p+(c+1)*u)/g),l.push(g)}return new ee({defines:{KERNEL_PAIRS:n.length},uniforms:{colorTexture:{value:null},invSize:{value:new _(.5,.5)},direction:{value:new _(.5,.5)},centerWeight:{value:a[0]},gaussianOffsets:{value:n},gaussianWeights:{value:l}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new ee({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};We.BlurDirectionX=new _(1,0);We.BlurDirectionY=new _(0,1);var Pt="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",$o=`
uniform float uNear; uniform float uFar;
float linZ(float d) { float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }`,Ve={STATIC:0,REGION:2};function cs({renderer:t,camera:e,Q:a,smokeScene:s,SU:n,setMode:l}){let c=new lo(null),p=[],u=(d,T,A)=>{let k=new lt(d,T,A);return p.push(k),k},g=d=>(d.depthTexture=new Ya(d.width,d.height),d.depthTexture.type=Ba,d),h={type:Ae},v=g(u(16,16,{...h,samples:a.msaa})),y=g(u(16,16,{...h})),C=u(16,16,{...h,depthBuffer:!1}),I=u(16,16,{...h,depthBuffer:!1}),K=u(16,16,{...h,depthBuffer:!1}),Q=u(16,16,{...h,depthBuffer:!1}),F=u(16,16,{...h,depthBuffer:!1}),H=u(16,16,{...h,format:Ua,depthBuffer:!1,minFilter:Oo,magFilter:Oo}),ae=u(16,16,{depthBuffer:!1}),$=new ee({uniforms:{tColor:{value:null},tDepth:{value:null}},vertexShader:Pt,fragmentShader:"uniform sampler2D tColor; uniform sampler2D tDepth; varying vec2 vUv; void main() { gl_FragColor = texture2D(tColor, vUv); gl_FragDepth = texture2D(tDepth, vUv).r; }",depthTest:!0,depthWrite:!0,depthFunc:Uo}),Ie=new ee({uniforms:{tStat:{value:y.texture},tEmb:{value:C.texture},tDepth:{value:y.depthTexture},uI:{value:1}},vertexShader:Pt,fragmentShader:"uniform sampler2D tStat; uniform sampler2D tEmb; uniform sampler2D tDepth; uniform float uI; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tStat, vUv).rgb + uI * texture2D(tEmb, vUv).rgb, 1.0); gl_FragDepth = texture2D(tDepth, vUv).r; }",depthTest:!0,depthWrite:!0,depthFunc:Uo}),j=new ee({uniforms:{tColor:{value:null},tDepth:{value:null},uFocus:{value:200},uEq:{value:600},uK:{value:1},uNear:{value:e.near},uFar:{value:e.far},uTexel:{value:new _},uMax:{value:8}},vertexShader:Pt,fragmentShader:`uniform sampler2D tColor; uniform sampler2D tDepth; uniform float uFocus; uniform float uEq; uniform float uK; uniform vec2 uTexel; uniform float uMax; varying vec2 vUv;
      ${$o}
      float coc(vec2 uv) { float d = linZ(texture2D(tDepth, uv).r) - uFocus; return min(uK * abs(d) / max(uEq + d, 1.0), uMax); }
      void main() {
        float c0 = coc(vUv);
        vec3 acc = texture2D(tColor, vUv).rgb; float wsum = 1.0;
        float rot = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2831853;
        float reach = max(c0, uMax * 0.5);
        for (int i = 1; i < 32; i++) {
          float r = sqrt(float(i) / 32.0) * reach;
          float a = float(i) * 2.39996 + rot;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
          float ci = coc(uv);
          float w = smoothstep(r - 1.0, r + 1.0, max(ci, c0 * 0.6)) * step(r, max(ci, c0) + 1.0);
          acc += texture2D(tColor, uv).rgb * w; wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, 1.0);
      }`,depthTest:!1,depthWrite:!1}),R=new ee({uniforms:{tDepth:{value:null},uNear:{value:e.near},uFar:{value:e.far}},vertexShader:Pt,fragmentShader:`uniform sampler2D tDepth; varying vec2 vUv; ${$o} void main() { gl_FragColor = vec4(linZ(texture2D(tDepth, vUv).r), 0.0, 0.0, 1.0); }`,depthTest:!1,depthWrite:!1}),E=a.bloomReal?new We(new _(16,16),.5,.3,3.2):null;if(E){let d=E.materialHighPassFilter;d.uniforms.tSmoke={value:F.texture},d.fragmentShader=d.fragmentShader.replace("uniform sampler2D tDiffuse;",`uniform sampler2D tDiffuse;
uniform sampler2D tSmoke;`).replace("vec4 texel = texture2D( tDiffuse, vUv );",`vec4 texel = texture2D( tDiffuse, vUv );
			float bloomMask = clamp( texel.a - 1.0, 0.0, 1.0 );
			{ vec4 s = texture2D( tSmoke, vUv ); texel.rgb = texel.rgb * ( 1.0 - s.a ) + s.rgb; }`),d.fragmentShader=d.fragmentShader.replace("float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );","float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v ) * bloomMask;"),d.needsUpdate=!0}let L=new ee({uniforms:{tScene:{value:v.texture},tDepth:{value:v.depthTexture},tDofStat:{value:I.texture},tDofEmb:{value:K.texture},tDofLive:{value:Q.texture},uDofK:{value:0},uBox:{value:new Oe(2,2,-1,-1)},uI:{value:1},tSmoke:{value:F.texture},tSmokeZ:{value:H.texture},uSmokeSize:{value:new _(1,1)},tBloom:{value:E?E.renderTargetsHorizontal[0].texture:null},uBloom:{value:E?1:0},uGlowPos:{value:new _},uGlowCol:{value:new w},uGlowR:{value:.05},uAspect:{value:1},uNear:{value:e.near},uFar:{value:e.far},seed:{value:0},toneMappingExposure:{value:1}},vertexShader:Pt,fragmentShader:`
      uniform sampler2D tScene; uniform sampler2D tDepth;
      uniform sampler2D tDofStat; uniform sampler2D tDofEmb; uniform sampler2D tDofLive; uniform float uDofK; uniform vec4 uBox; uniform float uI;
      uniform sampler2D tSmoke; uniform sampler2D tSmokeZ; uniform vec2 uSmokeSize;
      uniform sampler2D tBloom; uniform float uBloom;
      uniform vec2 uGlowPos; uniform vec3 uGlowCol; uniform float uGlowR; uniform float uAspect;
      uniform float seed;
      varying vec2 vUv;
      ${$o}
      #include <tonemapping_pars_fragment>
      // the smoke, upsampled: of the four texels around this pixel, those at this pixel's depth
      // (no halo of smoke from behind the cigarette over its edge, nor the other way round)
      vec4 smokeAt(vec2 uv) {
        vec2 st = uv * uSmokeSize - 0.5;
        vec2 f = fract(st);
        vec2 b = (floor(st) + 0.5) / uSmokeSize;
        vec2 o = 1.0 / uSmokeSize;
        float z = linZ(texture2D(tDepth, uv).r);
        vec4 acc = vec4(0.0); float wsum = 0.0;
        float best = 1e9; vec4 nearest = vec4(0.0);
        for (int k = 0; k < 4; k++) {
          vec2 q = vec2(float(k - (k / 2) * 2), float(k / 2));
          vec2 tuv = b + q * o;
          float zi = texture2D(tSmokeZ, tuv).r;
          vec4 si = texture2D(tSmoke, tuv);
          float wb = mix(1.0 - f.x, f.x, q.x) * mix(1.0 - f.y, f.y, q.y);
          float dz = abs(zi - z);
          float w = wb / (1.0 + dz * dz / max(0.0004 * z * z, 1e-4));
          acc += si * w; wsum += w;
          if (dz < best) { best = dz; nearest = si; }
        }
        // (all four agree: plain bilinear; across an edge: the nearest in depth)
        return best < 0.02 * z ? acc / max(wsum, 1e-5) : nearest;
      }
      void main() {
        vec3 c = texture2D(tScene, vUv).rgb;
        if (uDofK > 0.0) {
          bool inBox = vUv.x >= uBox.x && vUv.y >= uBox.y && vUv.x <= uBox.z && vUv.y <= uBox.w;
          vec3 d = inBox ? texture2D(tDofLive, vUv).rgb : texture2D(tDofStat, vUv).rgb + uI * texture2D(tDofEmb, vUv).rgb;
          c = mix(c, d, uDofK);
        }
        vec4 s = smokeAt(vUv);
        c = c * (1.0 - s.a) + s.rgb;
        if (uBloom > 0.5) c += texture2D(tBloom, vUv).rgb;
        else {
          // (lower tiers: the ember's glow as a soft disc on the screen, scaled by its intensity)
          vec2 g = (vUv - uGlowPos) * vec2(uAspect, 1.0);
          float r = length(g) / uGlowR;
          c += uGlowCol * (exp(-r * r * 3.0) * 0.7 + exp(-r * 1.6) * 0.3);
        }
        { vec2 dv = (vUv - 0.5) * vec2(1.0, 0.8); c *= mix(0.62, 1.0, smoothstep(0.85, 0.2, length(dv))); }
        c = ACESFilmicToneMapping(c);
        vec4 o = sRGBTransferOETF(vec4(c, 1.0));
        float n = fract(sin(dot(gl_FragCoord.xy + seed * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
        float l = dot(o.rgb, vec3(0.33));
        o.rgb += (n - 0.5) * (0.004 + 0.03 * l * (1.0 - l));
        gl_FragColor = o;
      }`,depthTest:!1,depthWrite:!1,toneMapped:!1}),de=null,G=!1,Ce=!1;import("./ember-SMAAPass-LXXAMYVG.js").then(({SMAAPass:d})=>{Ce||(de=new d,de.setSize(xe,ye),G=!0)});let xe=16,ye=16,Re=16,Fe=16;function vo(d,T){xe=d,ye=T,Re=Math.max(1,Math.round(d*a.smokeScale)),Fe=Math.max(1,Math.round(T*a.smokeScale));for(let A of[v,y,C,I,K,Q,ae])A.setSize(d,T);F.setSize(Re,Fe),H.setSize(Re,Fe),L.uniforms.uSmokeSize.value.set(Re,Fe),L.uniforms.uAspect.value=d/T,j.uniforms.uTexel.value.set(1/d,1/T),j.uniforms.uMax.value=12*(T/1080),n.uRes.value.set(Re,Fe),n.uPx.value=Fe/(2*Math.tan(re.degToRad(e.fov/2))),E&&E.setSize(Math.round(d*a.bloomScale*2),Math.round(T*a.bloomScale*2)),de?.setSize(d,T),ot="",Xe="",ce.valid=!1}function De(d,T,A){c.material=d,T&&(T.scissorTest=!!A,A&&T.scissor.copy(A)),t.setRenderTarget(T),c.render(t),T&&(T.scissorTest=!1)}let P=new Oe;function M(d,T,A,k,z){let O=Math.max(0,Math.floor(d.x*T-k)),pe=Math.max(0,Math.floor(d.y*A-k)),je=Math.min(T,Math.ceil(d.z*T+k)),he=Math.min(A,Math.ceil(d.w*A+k));return z.set(O,pe,Math.max(0,je-O),Math.max(0,he-pe))}function ut(d){let T=j.uniforms,A=2*d.s*Math.tan(re.degToRad(e.fov/2));T.uFocus.value=d.s,T.uEq.value=100+A*100/24;let k=2.8*Math.max(1,(d.home/d.s)**2);T.uK.value=.5*(100/k)*ye/A}let Ne=new Oe,ot="",bo=[6,10,14,18,22];function J(d){let T=d?`${d.x.toFixed(3)},${d.y.toFixed(3)},${d.z.toFixed(3)},${d.w.toFixed(3)}`:"all",A=[E.renderTargetBright,...E.renderTargetsHorizontal,...E.renderTargetsVertical];if(t.setClearColor(0,0),T!==ot){for(let U of A)U.scissorTest=!1,t.setRenderTarget(U),t.clear(!0,!1,!1);ot=T}let k=(U,ge)=>{if(!d){U.scissorTest=!1;return}M(d,U.width,U.height,ge,Ne),U.scissor.copy(Ne),U.scissorTest=!0},z=E.highPassUniforms;z.tDiffuse.value=v.texture,z.luminosityThreshold.value=E.threshold,c.material=E.materialHighPassFilter,k(E.renderTargetBright,2),t.setRenderTarget(E.renderTargetBright),t.clear(!0,!1,!1),c.render(t);let O=E.renderTargetBright,pe=2;for(let U=0;U<E.nMips;U++){let ge=E.separableBlurMaterials[U],ze=E.renderTargetsHorizontal[U];pe+=bo[U]*(xe/ze.width);let Ct=pe*(ze.width/xe)+2;c.material=ge,ge.uniforms.colorTexture.value=O.texture,ge.uniforms.direction.value=We.BlurDirectionX,k(ze,Ct),t.setRenderTarget(ze),t.clear(!0,!1,!1),c.render(t),ge.uniforms.colorTexture.value=ze.texture,ge.uniforms.direction.value=We.BlurDirectionY;let mt=E.renderTargetsVertical[U];k(mt,Ct),t.setRenderTarget(mt),t.clear(!0,!1,!1),c.render(t),O=mt}let je=E.compositeMaterial;je.uniforms.bloomStrength.value=E.strength,je.uniforms.bloomRadius.value=E.radius,je.uniforms.bloomTintColors.value=E.bloomTintColors,c.material=je;let he=E.renderTargetsHorizontal[0];k(he,pe*(he.width/xe)+2),t.setRenderTarget(he),t.clear(!0,!1,!1),c.render(t);for(let U of A)U.scissorTest=!1}let wo=new Oe,Xe="";function Le(d){let T=d?`${d.x.toFixed(3)},${d.y.toFixed(3)},${d.z.toFixed(3)},${d.w.toFixed(3)}`:"all";if(t.setClearColor(0,0),T!==Xe){for(let k of[F,H])k.scissorTest=!1,t.setRenderTarget(k),t.clear(!0,!1,!1);Xe=T}let A=d?M(d,Re,Fe,2,wo):null;R.uniforms.tDepth.value=v.depthTexture,De(R,H,A),n.uDepthZ.value=H.texture,F.scissorTest=!!A,A&&F.scissor.copy(A),t.setRenderTarget(F),t.clear(!0,!1,!1),t.render(s,e),F.scissorTest=!1,t.setClearColor(0,1)}let ce={valid:!1,targets:p,debugTargets:{live:v,cStat:y,cEmb:C,dStat:I,dEmb:K,dLive:Q,smoke:F,smokeZ:H},live:v,setSize:vo,bake(d,T,A){let k=e.layers.mask;t.setClearColor(0,1),A&&(e.layers.enable(Ve.STATIC),e.layers.enable(Ve.REGION),l("full"),t.shadowMap.needsUpdate=!0,t.setRenderTarget(v),t.clear(),t.render(d,e)),e.layers.set(Ve.STATIC),l("static"),t.setRenderTarget(v),t.clear(),t.render(d,e),$.uniforms.tColor.value=v.texture,$.uniforms.tDepth.value=v.depthTexture,t.setRenderTarget(y),t.clear(),De($,y),l("ember"),t.setRenderTarget(v),t.clear(),t.render(d,e),c.material=$,$.uniforms.tColor.value=v.texture,t.setRenderTarget(C),c.render(t),l("full"),e.layers.mask=k,a.dof&&(ut(T),j.uniforms.tDepth.value=y.depthTexture,j.uniforms.tColor.value=y.texture,De(j,I),j.uniforms.tColor.value=C.texture,De(j,K)),ce.valid=!0},render(d){let T=d.scene;t.setClearColor(0,1);let A=e.layers.mask;if(d.still&&!d.truth){Ie.uniforms.uI.value=d.emberI,De(Ie,v);let O=t.autoClear;t.autoClear=!1,e.layers.set(Ve.REGION),l("region"),t.setRenderTarget(v),t.render(T,e),l("full"),t.autoClear=O,e.layers.mask=A}else e.layers.enable(Ve.STATIC),e.layers.enable(Ve.REGION),t.setRenderTarget(v),t.clear(),t.render(T,e),e.layers.mask=A;let k=a.dof&&d.still?d.dofK:0;L.uniforms.uDofK.value=k,k>0&&(ut(d.focus),j.uniforms.tColor.value=v.texture,j.uniforms.tDepth.value=v.depthTexture,d.truth?P.set(0,0,xe,ye):M(d.regionBox,xe,ye,j.uniforms.uMax.value+2,P),De(j,Q,P),L.uniforms.uBox.value.set(P.x/xe,P.y/ye,(P.x+P.z)/xe,(P.y+P.w)/ye),L.uniforms.uI.value=d.emberI),Le(d.still&&!d.truth?d.smokeBox:null);let z=E&&a.bloomReal;L.uniforms.uBloom.value=z?1:0,z?J(d.still&&!d.truth?d.emberBox:null):(L.uniforms.uGlowPos.value.set(d.glow.x,d.glow.y),L.uniforms.uGlowR.value=d.glow.r,L.uniforms.uGlowCol.value.copy(d.glow.col)),L.uniforms.seed.value=d.seed,L.uniforms.toneMappingExposure.value=t.toneMappingExposure,!d.still&&a.smaa&&de&&!G?(De(L,ae),de.renderToScreen=!0,de.render(t,null,ae)):De(L,null),G&&d.still&&(de.renderToScreen=!1,de.render(t,Q,ae),G=!1)},dispose(){for(let d of p)d.dispose();for(let d of[$,Ie,j,R,L])d.dispose();c.dispose(),E?.dispose(),de?.dispose(),Ce=!0}};return ce}var mo={uEmberPosV:{value:new w},uEmberCol:{value:new oe(0,0,0)},uEmberI:{value:0},uEmberCut:{value:140}};function hs(){ke.lights_pars_begin.includes("uEmberPosV")||(ke.lights_pars_begin+=`
uniform vec3 uEmberPosV;
uniform vec3 uEmberCol;
uniform float uEmberI;
uniform float uEmberCut;
`,ke.lights_fragment_end+=`
#if defined( RE_Direct )
	if ( uEmberI > 0.0 ) {
		vec3 emberV = uEmberPosV - geometryPosition;
		float emberD = length( emberV );
		directLight.direction = emberV / max( emberD, 1e-4 );
		directLight.color = uEmberCol * getDistanceAttenuation( emberD, uEmberCut, 2.0 );
		directLight.visible = true;
		ReflectedLight emberRL = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
		#ifdef USE_CLEARCOAT
			vec3 emberCC = clearcoatSpecularDirect;
			clearcoatSpecularDirect = vec3( 0.0 );
		#endif
		#ifdef USE_SHEEN
			vec3 emberSh = sheenSpecularDirect;
			sheenSpecularDirect = vec3( 0.0 );
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, emberRL );
		reflectedLight.directDiffuse += emberRL.directDiffuse * uEmberI;
		reflectedLight.directSpecular += min( emberRL.directSpecular, vec3( 1.6 ) ) * uEmberI;
		#ifdef USE_CLEARCOAT
			clearcoatSpecularDirect = emberCC + min( clearcoatSpecularDirect, vec3( 1.6 ) ) * uEmberI;
		#endif
		#ifdef USE_SHEEN
			sheenSpecularDirect = emberSh + sheenSpecularDirect * uEmberI;
		#endif
	}
#endif
`)}function us(t){let e=t.customProgramCacheKey(),a=t.onBeforeCompile;return t.onBeforeCompile=function(s,n){Object.assign(s.uniforms,mo),a&&a.call(this,s,n)},t.customProgramCacheKey=()=>e,t}var nr=new oe(16738852),lr=new w;function Jo(t,e,a,s=180){mo.uEmberPosV.value.copy(lr.copy(t).applyMatrix4(e.matrixWorldInverse)),mo.uEmberCol.value.copy(nr).multiplyScalar(s),mo.uEmberI.value=a}var fo=(t,e,a)=>t<e?e:t>a?a:t;function ms(t,e,a){let s=Math.max(a-Math.abs(t-e),0)/a;return Math.min(t,e)-s*s*a*.25}function ea(t,e,a){let s=Math.max(a-Math.abs(t-e),0)/a;return Math.max(t,e)+s*s*a*.25}function Ye(t,e,a){let s=t*374761393+e*668265263+a*2147483647|0;return s=Math.imul(s^s>>>13,1274126177),s^=s>>>16,(s&65535)/32767.5-1}var ta=t=>t*t*t*(t*(t*6-15)+10),tt=(t,e,a)=>t+(e-t)*a;function le(t,e,a){let s=Math.floor(t),n=Math.floor(e),l=Math.floor(a),c=ta(t-s),p=ta(e-n),u=ta(a-l);return tt(tt(tt(Ye(s,n,l),Ye(s+1,n,l),c),tt(Ye(s,n+1,l),Ye(s+1,n+1,l),c),p),tt(tt(Ye(s,n,l+1),Ye(s+1,n,l+1),c),tt(Ye(s,n+1,l+1),Ye(s+1,n+1,l+1),c),p),u)}var te={radius:57.5,height:32,floor:9.2,bowlTop:46.3,bowlBottom:33,notch:{r:4.45,depth:4.6,angles:[.5,.5+2*Math.PI/3+.06,.5+4*Math.PI/3-.05]}},oa=(t,e)=>t*t+e*e;function fs(t,e,a,s,n){let l=s,c=n,p=s-a,u=2*n;t=Math.abs(t);let g=t-Math.min(t,e<0?a:s),h=Math.abs(e)-n,v=fo(((l-t)*p+(c-e)*u)/oa(p,u),0,1),y=t-l+p*v,C=e-c+u*v;return(y<0&&h<0?-1:1)*Math.sqrt(Math.min(oa(g,h),oa(y,C)))}function cr(t,e,a,s,n){let l=Math.abs(t)-a+n,c=Math.abs(e)-s+n;return Math.hypot(Math.max(l,0),Math.max(c,0))+Math.min(Math.max(l,c),0)-n}function aa(t){return{rim:.55*Math.sin(2*t+1.3)+.35*Math.sin(3*t+.4)+.18*Math.sin(5*t+2.1),out:.42*Math.sin(2*t+.2)+.25*Math.sin(4*t+1.7),inn:.5*Math.sin(3*t+2.6)+.22*Math.sin(5*t+.9)}}var At=1024,Ee=new Float32Array((At+1)*3);for(let t=0;t<=At;t++){let e=aa(t/At*2*Math.PI-Math.PI);Ee[t*3]=e.rim,Ee[t*3+1]=e.out,Ee[t*3+2]=e.inn}var po={rim:0,out:0,inn:0};function hr(t){let e=(t+Math.PI)/(2*Math.PI)*At,a=Math.min(At-1,Math.max(0,Math.floor(e))),s=e-a;return po.rim=Ee[a*3]+(Ee[a*3+3]-Ee[a*3])*s,po.out=Ee[a*3+1]+(Ee[a*3+4]-Ee[a*3+1])*s,po.inn=Ee[a*3+2]+(Ee[a*3+5]-Ee[a*3+2])*s,po}var ur=te.notch.angles.map(t=>aa(t).rim),ds=te.notch.angles.flatMap(t=>[Math.cos(t),Math.sin(t)]);function kt(t,e,a){let s=te,n=Math.atan2(a,t),l=hr(n),c=l.out,p=l.inn,u=l.rim,g=Math.hypot(t*1.006,a),h=u*fo((e-12)/20,0,1),v=e-h,y=2.6,C=fs(g-c,v-(3+s.height)/2,47-y,s.radius-y,(s.height-3)/2-y)-y;C=ms(C,cr(g-42.6,e-2,3.4,2.1,1.1),1.6);let I=7,K=fs(g+p,v-(s.floor+48)/2,s.bowlBottom-I,s.bowlTop+3-I+.35,(48-s.floor)/2-I)-I;C=ea(C,-K,2.4);let Q=s.notch,F=s.height-Q.depth+Q.r;if(e>F-Q.r-3&&g>36)for(let H=0;H<3;H++){let ae=Q.angles[H],$=ds[H*2],Ie=ds[H*2+1],j=t*$+a*Ie,R=-t*Ie+a*$,E=fo(j,40,62);if(Math.abs(R)>Q.r+3)continue;let L=Math.hypot(j-E,R,e-(F+ur[H]))-Q.r;C=ea(C,-L,1.7)}return C+=.28*le(t*.045,e*.06,a*.045)+.08*le(t*.16+7,e*.16,a*.16),C}function ps(t){let e=te.notch.angles[t],a=te.height-te.notch.depth+te.notch.r+aa(e).rim;return{angle:e,dir:[Math.cos(e),0,Math.sin(e)],y:a-te.notch.r,r:te.notch.r}}var Se={length:84,radius:3.9,filter:25,ashMax:15};function mr(t,e){let a=new Go(t.map(([c,p])=>new _(c,p)),e);a.rotateZ(-Math.PI/2);let s=a.attributes.position,n=new Float32Array(s.count),l=new Float32Array(s.count);for(let c=0;c<s.count;c++)n[c]=s.getX(c),l[c]=Math.atan2(s.getZ(c),-s.getY(c))/(2*Math.PI)+.5;return a.setAttribute("aAlong",new V(n,1)),a.setAttribute("aAround",new V(l,1)),a}var gs=`
float eh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float en(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(eh(i), eh(i + vec3(1, 0, 0)), f.x), mix(eh(i + vec3(0, 1, 0)), eh(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(eh(i + vec3(0, 0, 1)), eh(i + vec3(1, 0, 1)), f.x), mix(eh(i + vec3(0, 1, 1)), eh(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// the coal's glow at a point: orange-red at the core, deep red at the edges, slowly breathing
vec3 emberGlow(vec3 p, float t, float k) {
  float n = en(p * 1.6 + vec3(0.0, 0.0, t * 0.35)) * 0.65 + en(p * 4.2 - vec3(t * 0.6, 0.0, 0.0)) * 0.35;
  float heat = clamp(n * 1.25 - 0.18 + k * 0.25, 0.0, 1.0);
  vec3 deep = vec3(0.55, 0.04, 0.01);
  vec3 core = vec3(1.0, 0.33, 0.07);
  vec3 white = vec3(1.0, 0.62, 0.32);
  vec3 c = mix(deep, core, smoothstep(0.25, 0.75, heat));
  c = mix(c, white, smoothstep(0.85, 1.0, heat) * 0.5);
  return c * heat * heat;
}
`;function sa(t,e){let a=e,s=new _e({color:16777215,roughness:.72,sheen:.4,sheenRoughness:.6,sheenColor:new oe(.9,.86,.8)}),n={uBurn:{value:64.5},uSeed:{value:.3},uLit:{value:1},uFade:{value:1},uAshScale:{value:1},uPart:{value:0}};s.userData.u=n,s.onBeforeCompile=h=>{Object.assign(h.uniforms,n,{uTime:a.uTime,uEmber:a.uEmber,tCork:{value:t.cork},tPaper:{value:t.paper},tFibre:{value:t.fibre}}),h.vertexShader=h.vertexShader.replace("#include <common>",`#include <common>
attribute float aAlong;
attribute float aAround;
varying float vAlong;
varying float vAround;
varying vec3 vLocalN;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vAlong = aAlong;
vAround = aAround;
vLocalN = normal;`),h.fragmentShader=h.fragmentShader.replace("#include <common>",`#include <common>
        varying float vAlong; varying float vAround; varying vec3 vLocalN;
        uniform float uBurn; uniform float uSeed; uniform float uLit; uniform float uFade; uniform float uTime; uniform float uEmber; uniform float uPart;
        uniform sampler2D tCork; uniform sampler2D tPaper; uniform sampler2D tFibre;`).replace("#include <color_fragment>",`#include <color_fragment>
        float a = vAround * 6.2831853;
        // the burn line wanders round the cigarette
        float edge = uBurn + 0.42 * sin(a * 3.0 + uSeed * 6.0) + 0.27 * sin(a * 7.0 + 0.4 + uSeed) + 0.15 * sin(a * 13.0 + uSeed * 3.0);
        float d = edge - vAlong;
        if (d < 0.0 || (uPart > 0.5 && (uPart < 1.5 ? d < 4.0 : d >= 4.0))) discard;
        vec3 col;
        if (vAlong < 25.0) {
          // tipping paper: cork-tan with speckles, its overlap seam
          col = texture2D(tCork, vec2(vAround * 3.0, vAlong / 12.5)).rgb;
          float seam = 1.0 - smoothstep(0.0015, 0.004, abs(fract(vAround - 0.21) - 0.5) - 0.497);
          col *= 1.0 - 0.08 * seam;
        } else {
          // cigarette paper: off-white, faint laid lines, a thin glue seam
          vec4 pp = texture2D(tPaper, vec2(vAround * 2.0, vAlong / 18.0));
          col = vec3(0.93, 0.915, 0.885) * (0.985 + 0.015 * pp.r) * (0.97 + 0.03 * pp.g);
          float seam = 1.0 - smoothstep(0.0008, 0.0022, abs(fract(vAround - 0.73) - 0.5) - 0.4985);
          col *= 1.0 - 0.05 * seam;
        }
        // the filter's cut end: cellulose fibres
        float face = smoothstep(-0.6, -0.85, vLocalN.x) * step(vAlong, 0.6);
        col = mix(col, vec3(0.86, 0.82, 0.74) * (0.82 + 0.25 * texture2D(tFibre, vec2(vObjYZ().x, vObjYZ().y) / 7.8 + 0.5).r), face);
        // scorch: cream, amber, brown, then the black char lip at the edge (linear values of
        // sRGB #0f0b0a, #5c331a, #b3733a, #ebd6a8)
        float t = d / 2.6;
        vec3 sc = mix(vec3(0.005, 0.0034, 0.003), vec3(0.107, 0.033, 0.01), smoothstep(0.06, 0.26, t));
        sc = mix(sc, vec3(0.45, 0.17, 0.042), smoothstep(0.26, 0.52, t));
        sc = mix(sc, vec3(0.83, 0.67, 0.39), smoothstep(0.5, 0.82, t));
        col = mix(sc, col, smoothstep(0.75, 1.0, t));
        diffuseColor.rgb = col;
        diffuseColor.a *= uFade;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
        roughnessFactor = mix(0.55, roughnessFactor, step(25.0, vAlong));
        roughnessFactor = mix(0.9, roughnessFactor, smoothstep(0.1, 0.4, d / 2.6));`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        // the ember shows through the thin paper in the last few millimetres
        totalEmissiveRadiance += vec3(1.0, 0.36, 0.1) * uEmber * uLit * exp(-d / 1.05) * 1.4 * smoothstep(0.05, 0.25, d / 2.6) * step(25.0, vAlong) * smoothstep(4.0, 3.0, d);`),h.fragmentShader=h.fragmentShader.replace("#include <opaque_fragment>",`#include <opaque_fragment>
#ifdef OPAQUE
gl_FragColor.a = 1.0 + step(d, 4.0) * step(25.0, vAlong) * uLit;
#endif`),h.fragmentShader=h.fragmentShader.replace("void main() {",`varying vec3 vObjP;
vec2 vObjYZ() { return vObjP.yz; }
void main() {`),h.vertexShader=h.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vObjP;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vObjP = position;`)},s.customProgramCacheKey=()=>"cig-body",s.transparent=!1;let l=fr(n),c=new ee({uniforms:{uTime:a.uTime,uEmber:a.uEmber,uLit:n.uLit,uFade:n.uFade},vertexShader:"varying vec3 vP; varying vec3 vN; void main() { vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",fragmentShader:`${gs}
      uniform float uTime; uniform float uEmber; uniform float uLit; uniform float uFade;
      varying vec3 vP; varying vec3 vN;
      void main() {
        vec3 c = emberGlow(vP, uTime, uEmber - 1.0) * (4.0 + 12.0 * uEmber) * uLit;
        // where the glow dies the coal is charcoal-dark
        vec3 dark = vec3(0.025, 0.018, 0.016);
        gl_FragColor = vec4((dark + c) * uFade, 2.0); // (alpha above 1: blooms)
      }`}),p=new _e({color:16777215,roughness:.95});p.onBeforeCompile=h=>{Object.assign(h.uniforms,{uTime:a.uTime,uEmber:a.uEmber,uLit:n.uLit,uFade:n.uFade,uBurn:n.uBurn,uAshScale:n.uAshScale}),h.vertexShader=h.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vAshP;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vAshP = position;`),h.fragmentShader=h.fragmentShader.replace("#include <common>",`#include <common>
        ${gs}
        varying vec3 vAshP;
        uniform float uTime; uniform float uEmber; uniform float uLit; uniform float uFade; uniform float uBurn; uniform float uAshScale;
        float ashH; float ashCrack; float ashPore; float ashX; vec3 ashQ;
        // a thin line where t is near a whole number, antialiased by its own footprint (it fades
        // with distance rather than shimmering)
        float ashLine(float t, float w) {
          float fw = max(fwidth(t), 1e-5);
          float d = min(fract(t), 1.0 - fract(t));
          return (1.0 - smoothstep(w - fw * 0.5, w + fw * 0.5, d)) * min(1.0, 2.0 * w / fw);
        }`).replace("#include <color_fragment>",`#include <color_fragment>
        {
          ashX = 0.7 + vAshP.x * uAshScale;               // mm from the burn line
          ashQ = vec3(uBurn + ashX, vAshP.y, vAshP.z);     // the cigarette's frame
          vec3 rq = vec3(ashQ.x, ashQ.yz * 0.23);          // (round it, about one unit)
          float a = atan(ashQ.z, -ashQ.y);
          float lay = en(vec3(ashQ.x * 1.7 + 0.8 * en(ashQ * 0.7), rq.yz * 0.9));
          float ring = ashLine(ashQ.x * 0.43 + 0.7 * en(ashQ * vec3(0.35, 0.9, 0.9) + 7.0), 0.03) * smoothstep(0.4, 0.62, en(vec3(ashQ.x * 0.4, rq.yz * 1.6 + 3.0)));
          float lon = ashLine(a * 0.7958 + 0.25 * en(ashQ * vec3(0.5, 0.9, 0.9) + 11.0), 0.012) * smoothstep(0.45, 0.7, en(vec3(ashQ.x * 0.6 + 5.0, rq.yz * 1.3))) * smoothstep(2.4, 3.3, length(ashQ.yz));
          ashCrack = max(ring, lon);
          ashPore = smoothstep(0.6, 0.85, en(ashQ * 7.0)) * (1.0 - smoothstep(0.04, 0.12, fwidth(ashQ.x)));
          float lump = en(ashQ * 1.8 + 3.0);
          ashH = 0.06 * lump + 0.03 * lay - 0.08 * ashCrack - 0.03 * ashPore;
          // (linear: pale grey #9a9895 to near-white #d9d7d3; charcoal #1f1d1b at the base)
          vec3 c = mix(vec3(0.32, 0.31, 0.3), vec3(0.69, 0.68, 0.65), smoothstep(0.2, 0.9, lay)) * (0.88 + 0.16 * lump);
          c *= 1.0 - 0.6 * ashCrack - 0.3 * ashPore;
          c = mix(vec3(0.014, 0.013, 0.012), c, smoothstep(0.15, 3.6, ashX));
          diffuseColor.rgb = c;
          diffuseColor.a *= uFade;
        }`).replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
        {
          // (bumped by the height above, through its screen-space slope)
          vec3 dpx = dFdx(-vViewPosition);
          vec3 dpy = dFdy(-vViewPosition);
          vec2 dH = vec2(dFdx(ashH), dFdy(ashH));
          vec3 r1 = cross(dpy, normal);
          vec3 r2 = cross(normal, dpx);
          float det = dot(dpx, r1) * faceDirection;
          normal = normalize(abs(det) * normal - sign(det) * (dH.x * r1 + dH.y * r2));
        }`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        // the ember glowing through the cracks and pores near the base
        totalEmissiveRadiance += emberGlow(ashQ * 1.3, uTime, uEmber - 1.0) * (ashCrack * 3.2 + ashPore * 0.9 + 0.3) * exp(-max(ashX, 0.0) / 1.3) * (2.2 + 6.0 * uEmber) * uLit * uFade;`)};let u=p.onBeforeCompile;p.onBeforeCompile=h=>{u(h),h.fragmentShader=h.fragmentShader.replace("#include <opaque_fragment>",`#include <opaque_fragment>
#ifdef OPAQUE
gl_FragColor.a = 1.0 + uLit;
#endif`)},p.customProgramCacheKey=()=>"cig-ash";let g=new _e({color:5913119,roughness:.85});return{body:s,bodyDepth:l,ember:c,ash:p,tobacco:g,u:n}}function fr(t){let e=new Qa({depthPacking:Oa});return e.onBeforeCompile=a=>{Object.assign(a.uniforms,{uBurn:t.uBurn,uSeed:t.uSeed}),a.vertexShader=a.vertexShader.replace("#include <common>",`#include <common>
attribute float aAlong;
attribute float aAround;
varying float vAlong;
varying float vAround;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vAlong = aAlong;
vAround = aAround;`),a.fragmentShader=a.fragmentShader.replace("#include <common>",`#include <common>
varying float vAlong; varying float vAround; uniform float uBurn; uniform float uSeed;`).replace("void main() {",`void main() {
        float a = vAround * 6.2831853;
        if (uBurn + 0.42 * sin(a * 3.0 + uSeed * 6.0) + 0.27 * sin(a * 7.0 + 0.4 + uSeed) + 0.15 * sin(a * 13.0 + uSeed * 3.0) - vAlong < 0.0) discard;`)},e.customProgramCacheKey=()=>"cig-depth",e}function vs(t){return mr([[0,.35],[3.25,.35],[3.42,.21],[3.6,.05],[3.8,.02],[3.88,.12],[3.9,.32],[3.9,2],...Array.from({length:41},(e,a)=>[3.9,2+a*2]),[0,84]],t)}function bs(t){let e=new Go([[0,-.6],[3.93,-.6],[3.95,-.15],[3.92,.35],[3.82,.75],[3.45,1.1],[2.7,1.5],[1.4,1.9],[0,2]].map(([a,s])=>new _(a,s)),t);return e.rotateZ(-Math.PI/2),e}function ws(t){let e=Se.ashMax,a=90,s=t+1,n=[],l=[],c=g=>-.0055*(g+.7)*(g+.7);for(let g=0;g<=a;g++){let v=g/a*e,y=Math.min(1,v/1.6),C=.935+.065*y*y*(3-2*y);for(let I=0;I<=t;I++){let K=I/t*Math.PI*2,Q=.035*Math.sin(v*2.4+1.7*Math.sin(K*2+v*.3))+.09*le(v*.9,Math.cos(K)*2,Math.sin(K)*2)+.05*le(v*2.3+4,Math.cos(K)*4,Math.sin(K)*4),F=Math.max(0,(v-(e-2.6))/2.6),H=Math.sqrt(Math.max(0,1-F*F*(.92+.08*le(K*2,3,1)))),ae=(4.03+Q)*(.25+.75*H)*C;n.push(v,Math.cos(K)*ae*-1+c(v),Math.sin(K)*ae)}}for(let g=0;g<a;g++)for(let h=0;h<t;h++){let v=g*s+h,y=v+s;l.push(v,y,v+1,v+1,y,y+1)}let p=n.length/3;n.push(e+.05,c(e+.05),0);for(let g=0;g<t;g++)l.push(a*s+g,p,a*s+g+1);let u=new qe;return u.setAttribute("position",new Ga(n,3)),u.setIndex(l),u.computeVertexNormals(),u}function Es(){let t=[],e=11,a=()=>(e=e*16807%2147483647)/2147483647;for(let n=0;n<7;n++){let l=a()*Math.PI*2,c=3.2+a()*.6,p=[];for(let u=0;u<=5;u++){let g=u/5,h=c+g*(.4+a()*.5),v=l+g*(a()-.5)*.8;p.push(new w(-.6+g*(1.2+a()*1.4),-Math.cos(v)*h,Math.sin(v)*h))}t.push(new qo(new No(p),10,.07+a()*.05,5,!1))}let s=dr(t);for(let n of t)n.dispose();return s}function dr(t){let e=0,a=0;for(let h of t)e+=h.attributes.position.count,a+=h.index.count;let s=new Float32Array(e*3),n=new Float32Array(e*3),l=new Float32Array(e*2),c=new Uint32Array(a),p=0,u=0;for(let h of t){s.set(h.attributes.position.array,p*3),n.set(h.attributes.normal.array,p*3),l.set(h.attributes.uv.array,p*2);let v=h.index.array;for(let y=0;y<v.length;y++)c[u+y]=v[y]+p;p+=h.attributes.position.count,u+=v.length}let g=new qe;return g.setAttribute("position",new V(s,3)),g.setAttribute("normal",new V(n,3)),g.setAttribute("uv",new V(l,2)),g.setIndex(new V(c,1)),g}function xs(t){let a=new No([new w(0,0,0),new w(12,.2,.3),new w(22,1,1.8),new w(28,2.4,4.4),new w(31,3,6.4)]),s=new qo(a,60,Se.radius,t,!1),n=s.attributes.position,l=s.attributes.uv,c=new Float32Array(n.count),p=new Float32Array(n.count),u=new w;for(let g=0;g<n.count;g++){let h=l.getX(g);c[g]=h*31,p[g]=l.getY(g);let v=Math.max(0,(h-.62)/.38);a.getPointAt(Math.min(1,h),u);let y=n.getY(g)-u.y;n.setY(g,u.y+y*(1-.55*v))}return s.setAttribute("aAlong",new V(c,1)),s.setAttribute("aAround",new V(p,1)),s.computeVertexNormals(),{geometry:s,end:a.getPointAt(1),endDir:a.getTangentAt(1)}}function ys(){let t=new Ka(42,2.1,2.1,84,2,2),e=t.attributes.position;for(let a=0;a<e.count;a++){let s=e.getY(a),n=e.getZ(a),l=Math.max(Math.abs(s),Math.abs(n));if(l>0){let c=Math.hypot(s,n),p=1.05/Math.max(c,1e-6),u=.35;e.setY(a,s*(1-u)+s*p*u*(l/1.05)),e.setZ(a,n*(1-u)+n*p*u*(l/1.05))}}return t.translate(21,0,0),t.computeVertexNormals(),t}function Ts(){let t=new Xa(1,1,.28,9,1),e=t.attributes.position;for(let a=0;a<e.count;a++){let s=e.getX(a),n=e.getZ(a),l=Math.atan2(n,s),c=.75+.35*le(Math.cos(l)*1.7,Math.sin(l)*1.7,5);e.setX(a,s*c),e.setZ(a,n*c*.8),e.setY(a,e.getY(a)+.08*le(s*2,1,n*2))}return t.computeVertexNormals(),t}var Ke=512,Rs=30,pr=`
uniform sampler3D uCurl;
vec3 curl(vec3 p) { return texture(uCurl, p * 0.125).xyz; }
`,Ms=`
uniform float uTime;
uniform sampler2D uHist;       // rows: 0 emitter (xyz, alive), 1 pointer (xyz, strength), 2 pointer velocity (xyz), puff
uniform float uHistHead;       // the current slot
uniform vec3 uViewDir;         // camera forward (for the pointer's swirl axis)
uniform float uCalm;           // 1, or less when motion is reduced
${pr}
vec4 hist(float row, float t) {
  // t: seconds ago; (the history is a ring, read with linear filtering along it)
  float slot = uHistHead - t * ${Rs.toFixed(1)};
  return texture2D(uHist, vec2((mod(slot, ${Ke.toFixed(1)}) + 0.5) / ${Ke.toFixed(1)}, (row + 0.5) / 3.0));
}
// the velocity of smoke at p that left the ember at time tb and is now a seconds old
vec3 flow(vec3 p, float tb, float a, float seed) {
  float tt = tb + a;
  float ago = uTime - tt;
  // buoyant rise, slowing as it mixes with the air
  vec3 v = vec3(0.0, 24.0 * exp(-a * 0.42) + 5.0, 0.0);
  // laminar for the first few centimetres, then unstable: the plume's own eddies (shared by every
  // strand, so they rise as one stream), then each strand's finer detail (so they part)
  float turb = smoothstep(0.75, 2.3, a) * uCalm;
  v += curl(p * 0.035 + vec3(0.0, -tt * 0.09, 0.0)) * (6.5 * turb);
  v += curl(p * 0.065 + vec3(seed * 3.7, -tt * 0.15, seed * 2.3)) * (2.4 * turb * turb);
  // the room's slow drift, and now and then a slow eddy across it
  vec2 dd = vec2(cos(tt * 0.031 + 0.8), sin(tt * 0.031 + 0.8));
  float gust = pow(max(0.0, sin(tt * 0.11 + 1.3 * sin(tt * 0.037))), 8.0);
  v.xz += (dd * (1.1 + 0.7 * sin(tt * 0.07)) + vec2(-dd.y, dd.x) * gust * 5.0) * mix(0.35, 1.0, turb);
  // the pointer, where it was then: a swirl round it and a push along its motion
  vec4 ptr = hist(1.0, ago);
  vec4 pv = hist(2.0, ago);
  if (ptr.w > 0.001) {
    vec3 r = p - ptr.xyz;
    float fall = exp(-dot(r, r) / 420.0);
    v += ptr.w * fall * (pv.xyz * 0.5 + cross(uViewDir, r) * 3.0);
  }
  // a flick shakes it
  return v * (1.0 + 0.6 * pv.w * turb);
}
// where the smoke that left the ember "age" seconds ago is now (steps shorter where it is fast and
// where the instability starts)
vec3 advect(float age, float seed, out vec3 vel) {
  float tb = uTime - age;
  vec3 p = hist(0.0, age).xyz;
  vel = vec3(0.0, 1.0, 0.0);
  float a0 = 0.0;
  for (int i = 1; i <= STEPS; i++) {
    float f = float(i) / float(STEPS);
    float a1 = age * f * sqrt(f);
    vel = flow(p, tb, 0.5 * (a0 + a1), seed);
    p += vel * (a1 - a0);
    a0 = a1;
  }
  return p;
}
// the instability: a sideways wave that grows a few centimetres up and travels up the stream
vec3 sway(float tb, float age) {
  float A = 4.0 * smoothstep(0.4, 1.4, age) * (0.55 + 0.45 * sin(tb * 0.23 + 1.0)) * uCalm;
  float ph = tb * 9.4 + 1.6 * sin(tb * 0.31) + 0.9 * sin(tb * 0.83 + 2.0);
  float th = tb * 0.17 + 0.8 * sin(tb * 0.11);
  return vec3(cos(th), 0.0, sin(th)) * (A * sin(ph));
}
`;function gr(t,e){let a=t*(e+1)*2,s=new Float32Array(a),n=new Float32Array(a),l=new Float32Array(a),c=[],p=0;for(let g=0;g<t;g++){let h=g/t+.37*Math.sin(g*12.9898);for(let v=0;v<=e;v++){for(let y of[-1,1])s[p]=v/e,n[p]=y,l[p]=h,p++;if(v<e){let y=(g*(e+1)+v)*2;c.push(y,y+1,y+2,y+1,y+3,y+2)}}}let u=new qe;return u.setAttribute("aS",new V(s,1)),u.setAttribute("aSide",new V(n,1)),u.setAttribute("aSeed",new V(l,1)),u.setAttribute("position",new V(new Float32Array(a*3),3)),u.setIndex(c),u.boundingSphere=new Io(new w,1e5),u}function vr(t){let e=new Float32Array(t*4),a=7,s=()=>(a=a*16807%2147483647)/2147483647;for(let l=0;l<t*4;l++)e[l]=s();let n=new qe;return n.setAttribute("aSeed",new V(e,4)),n.setAttribute("position",new V(new Float32Array(t*3),3)),n.boundingSphere=new Io(new w,1e5),n}var _s=`
uniform vec3 uRimPos;      // the cool back light (a narrow spot): where it is, where it points, its cone
uniform vec3 uRimDir;
uniform vec2 uRimCone;     // (cos of the outer angle, cos of the inner)
uniform vec3 uKeyPos;
uniform vec3 uCam;
uniform float uBright;
uniform vec3 uEmberPos;
uniform float uEmberI;
// the light the smoke here sends towards the eye: mostly the back light, scattered forwards
// (Henyey-Greenstein: smoke lit from behind glows), a little of the key, the ember's own glow
vec3 smokeLight(vec3 p) {
  vec3 v = normalize(uCam - p);
  vec3 toP = normalize(p - uRimPos);
  float cone = smoothstep(uRimCone.x, uRimCone.y, dot(toP, uRimDir));
  float hg = 0.6156 / pow(1.3844 - 1.24 * dot(toP, v), 1.5);
  float hk = 0.91 / pow(1.09 - 0.6 * dot(normalize(p - uKeyPos), v), 1.5);
  vec3 e = p - uEmberPos;
  float ember = uEmberI / (1.0 + dot(e, e) * 0.04);
  return (vec3(0.75, 0.84, 1.0) * cone * hg * 0.36 + vec3(1.0, 0.82, 0.62) * hk * 0.05 + vec3(1.0, 0.42, 0.12) * ember * 0.5 + vec3(0.008, 0.01, 0.014)) * uBright;
}
`,Ss=`
uniform sampler2D uDepthZ;  // the scene's linear depth (mm) at the smoke's own resolution
uniform vec2 uRes;          // the smoke target's size
// soft against the scene: fades out as it nears whatever is behind it, gone behind it
float depthFade(float viewZ) {
  float scene = texture2D(uDepthZ, gl_FragCoord.xy / uRes).r;
  return clamp((scene - viewZ) / 4.0, 0.0, 1.0);
}
float h1(float n) { return fract(sin(n) * 43758.5453); }
float vnoise(vec2 x) {
  vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  float n = i.x + i.y * 57.0;
  return mix(mix(h1(n), h1(n + 1.0), f.x), mix(h1(n + 57.0), h1(n + 58.0), f.x), f.y);
}
`;function Ds(t,e){let a=e,s={transparent:!0,depthTest:!1,depthWrite:!1,blending:Ca,blendSrc:zo,blendDst:Bo,blendSrcAlpha:zo,blendDstAlpha:Bo},n=new ee({defines:{STEPS:t.smokeSteps,STRANDS:t.strands.toFixed(1),SEGMENTS:t.segments.toFixed(1)},uniforms:a,vertexShader:`
      attribute float aS;
      attribute float aSide;
      attribute float aSeed;
      uniform float uLife;
      uniform float uPx;         // pixels per mm at 1 mm distance (in the smoke target)
      ${Ms}
      ${_s}
      varying float vSide;
      varying float vB;
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying float vSeed;
      varying float vTwist;
      void main() {
        float age = pow(aS, 1.25) * uLife + 0.0005;
        float tb = uTime - age;
        vec3 vel;
        vec3 p = advect(age, aSeed, vel) + sway(tb, age);
        // the next vertex up the strand: the ribbon's real direction, and how far the smoke between
        // the two has been stretched (the same smoke over a longer path is thinner: where the eddies
        // stretch it, it fades; where they fold it, it gathers)
        float da = 1.25 * pow(max(aS, 0.002), 0.25) * uLife / SEGMENTS;
        vec3 vel2;
        vec3 p2 = advect(age + da, aSeed, vel2) + sway(tb - da, age + da);
        vec3 d = p2 - p;
        float len = length(d);
        float stretch = len / da;           // mm of ribbon per second of smoke
        vec3 view = normalize(uCam - p);
        vec3 T = len > 1e-4 ? d / len : normalize(vel);
        // a thread at first (always facing the eye), then a sheet that turns as it rises: seen
        // edge-on it is narrower and denser, which is what makes smoke look like smoke
        float twist = smoothstep(0.8, 2.6, age);
        vec3 face = normalize(cross(T, view) + vec3(1e-5));
        float tw = aSeed * 6.2832 + age * 0.85 + 0.8 * sin(tb * 0.37 + aSeed * 4.0);
        vec3 sheet = normalize(cross(T, vec3(cos(tw), 0.31, sin(tw))) + vec3(1e-5));
        sheet *= sign(dot(sheet, face) + 1e-4);
        vec3 across = normalize(mix(face, sheet, 0.8 * twist));
        float seen = length(across - view * dot(across, view));
        float w = mix(0.28, 4.6, smoothstep(0.25, 7.0, age)) * (0.7 + 0.6 * fract(aSeed * 7.13));
        // the stream's opacity shared between the strands; then the same smoke spread over the
        // ribbon's length and width
        float ink = (29.0 / max(stretch, 3.0)) * (0.28 / w);
        float a = (1.0 - pow(0.36, 1.0 / STRANDS)) * mix(1.0, min(ink, 0.55), smoothstep(0.3, 2.0, age)) * mix(1.0, 1.5, smoothstep(1.0, 4.0, age)) / max(seen, 0.4);
        // never under a pixel and a half wide (thinner would shimmer): the same ink, spread wider
        float vz = -(modelViewMatrix * vec4(p, 1.0)).z;
        float minW = 0.75 * max(vz, 1.0) / uPx;
        float hw = w * seen;
        a *= hw / max(hw, minW);
        p += (across * w + face * max(0.0, minW - hw)) * aSide;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vViewZ = -mv.z;
        vSide = aSide;
        vB = tb;
        vSeed = aSeed;
        vTwist = twist;
        vec4 em = hist(0.0, age);          // was the ember alive when this left it?
        float puff = hist(2.0, age).w;
        vAlpha = a * smoothstep(0.0, 0.012, aS) * (1.0 - smoothstep(0.45, 1.0, aS)) * em.w * (1.0 + 0.8 * puff);
        vLight = smokeLight(p);
      }`,fragmentShader:`
      ${Ss}
      varying float vSide;
      varying float vB;
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying float vSeed;
      varying float vTwist;
      float sq(float x) { return x * x; }
      void main() {
        // across: a smooth thread near the ember; higher up, a few fine filaments that braid
        // (they travel with the smoke: they are functions of when it left the ember)
        float s = vSide;
        float thread = exp(-s * s * 3.0);
        float b = vB;
        float fil = exp(-sq((s - 0.42 * sin(b * 1.7 + vSeed * 5.0)) * 2.4))
                  + 0.8 * exp(-sq((s + 0.5 * sin(b * 1.1 + vSeed * 3.0 + 1.0)) * 3.2))
                  + 0.6 * exp(-sq((s - 0.15 * cos(b * 2.6 + vSeed * 7.0)) * 5.0));
        fil = min(fil, 1.3) * (1.0 - s * s);
        float prof = mix(thread, fil, vTwist);
        // along: denser and thinner stretches, carried up with it
        float along = 0.55 + 0.45 * vnoise(vec2(b * 3.1 + vSeed * 9.0, s * 1.3 + vSeed * 3.0));
        float a = vAlpha * prof * mix(1.0, along, vTwist);
        a *= depthFade(vViewZ);
        if (a < 0.0015) discard;
        // bluish where thin, greyer where dense
        vec3 col = vLight * mix(vec3(0.9, 0.94, 1.0), vec3(0.97), clamp(a * 3.0, 0.0, 1.0));
        gl_FragColor = vec4(col * a, a);
      }`,side:to,...s}),l=new ie(gr(t.strands,t.segments),n);l.frustumCulled=!1;let c=new ee({defines:{STEPS:Math.max(4,t.smokeSteps-4),HAZE_K:(900/t.haze).toFixed(3)},uniforms:a,vertexShader:`
      attribute vec4 aSeed;
      uniform float uHazeLife;
      uniform float uPx;
      ${Ms}
      ${_s}
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying vec2 vSeed;
      void main() {
        // (the haze starts a little way up, where the stream has already broken up)
        float age = mod(uTime + aSeed.x * uHazeLife, uHazeLife) + 3.6;
        float tb = uTime - age;
        vec3 vel;
        vec3 p = advect(age, aSeed.y * 1.3, vel) + sway(tb, age);
        // the plume diffusing into the room: each mote drifts out from it as it rises
        float th = aSeed.z * 6.2832;
        vec3 dir = vec3(cos(th), (aSeed.w - 0.5) * 0.7, sin(th)) * sqrt(fract(aSeed.w * 7.31 + aSeed.z));
        p += dir * (4.0 + 3.4 * (age - 3.6));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vViewZ = -mv.z;
        float size = mix(18.0, 50.0, smoothstep(3.6, 15.6, age)) * (0.7 + 0.6 * fract(aSeed.z * 13.7));
        gl_PointSize = size * uPx / vViewZ;
        float life = (age - 3.6) / uHazeLife;
        vAlpha = 0.0028 * HAZE_K * smoothstep(0.0, 0.3, life) * (1.0 - smoothstep(0.45, 1.0, life)) * hist(0.0, age).w;
        vLight = smokeLight(p);
        vSeed = aSeed.zw;
      }`,fragmentShader:`
      ${Ss}
      varying float vAlpha;
      varying vec3 vLight;
      varying float vViewZ;
      varying vec2 vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r2 = dot(c, c) * 4.0;
        if (r2 > 1.0) discard;
        // a soft blob, its edge eaten by noise: never a circle
        // (eaten by noise all the way in: wisps, never a disc)
        float n = vnoise(c * 2.6 + vSeed * 40.0) * 0.6 + vnoise(c * 5.5 + vSeed.yx * 40.0) * 0.4;
        float a = vAlpha * (1.0 - r2) * (1.0 - r2) * smoothstep(0.3, 0.8, n);
        a *= depthFade(vViewZ);
        if (a < 0.0008) discard;
        vec3 col = vLight * vec3(0.9, 0.94, 1.0);
        gl_FragColor = vec4(col * a, a);
      }`,...s}),p=new Wa(vr(t.haze),c);return p.frustumCulled=!1,{ribbons:l,haze:p,dispose:()=>[l.geometry,p.geometry,n,c].forEach(u=>u.dispose())}}var go=class{constructor(){this.data=new Uint16Array(Ke*3*4),this.tex=new no(this.data,Ke,3,oo,Ae),this.tex.wrapS=Rt,this.tex.wrapT=La,this.tex.magFilter=this.tex.minFilter=Dt,this.tex.needsUpdate=!0,this.slot=0,this.t=0}fill(e,a){for(let s=0;s<Ke;s++)this.write(s,e,a,null,0,null);this.tex.needsUpdate=!0}write(e,a,s,n,l,c,p=0){let u=this.data,g=ja.toHalfFloat,h=e*4;u[h]=g(a[0]),u[h+1]=g(a[1]),u[h+2]=g(a[2]),u[h+3]=g(s),h=(Ke+e)*4,n&&(u[h]=g(n[0]),u[h+1]=g(n[1]),u[h+2]=g(n[2])),u[h+3]=g(l),h=(2*Ke+e)*4,u[h]=g(c?c[0]:0),u[h+1]=g(c?c[1]:0),u[h+2]=g(c?c[2]:0),u[h+3]=g(p)}advance(e,a,s,n,l,c,p=0){this.t+=e*Rs;let u=!1;for(;this.t>=1;)this.t-=1,this.slot=(this.slot+1)%Ke,this.write(this.slot,a,s,n,l,c,p),u=!0;return this.write(this.slot,a,s,n,l,c,p),(u||l>0||p>0)&&(this.tex.needsUpdate=!0),this.slot}dispose(){this.tex.dispose()}};ke.lights_physical_pars_fragment.includes("+ 0.08 );")||(ke.lights_physical_pars_fragment=ke.lights_physical_pars_fragment.replaceAll("float alpha = pow2( roughness ); // UE4's roughness","float alpha = min( 1.0, pow2( roughness ) + 0.08 );"));ke.lights_fragment_end.includes("(only the ember blooms)")||(ke.lights_fragment_end+=`
// (only the ember blooms)
reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 2.2 ) );
#ifdef USE_CLEARCOAT
clearcoatSpecularDirect = min( clearcoatSpecularDirect, vec3( 2.2 ) );
#endif
`);hs();var ra={high:{name:"high",dpr:2,strands:10,segments:160,haze:1800,smokeSteps:10,smokeScale:.5,dof:!0,bloomReal:!0,bloomScale:.5,shadow:2048,msaa:4,smaa:!0,fps:60,trayH:.6,segs:64},medium:{name:"medium",dpr:1.5,strands:8,segments:120,haze:1100,smokeSteps:8,smokeScale:.5,dof:!1,bloomReal:!1,bloomScale:.35,shadow:1024,msaa:4,smaa:!0,fps:60,trayH:.75,segs:48},low:{name:"low",dpr:1,strands:6,segments:80,haze:500,smokeSteps:6,smokeScale:.25,dof:!1,bloomReal:!1,bloomScale:.25,shadow:1024,msaa:2,smaa:!1,fps:30,trayH:.9,segs:32}},Hs=["high","medium","low"];function br(){let t=navigator,e=t.userAgent||"",a=/Android|iPhone|iPad|iPod|Mobile/i.test(e)||t.maxTouchPoints>1&&/Macintosh/.test(e),s="";try{let h=document.createElement("canvas").getContext("webgl2"),v=h&&h.getExtension("WEBGL_debug_renderer_info");s=h?String(h.getParameter(v?v.UNMASKED_RENDERER_WEBGL:h.RENDERER)):"",h?.getExtension("WEBGL_lose_context")?.loseContext()}catch{s=""}let n=t.deviceMemory||8,l=t.hardwareConcurrency||4,c=/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(s),p=/Intel\(R\) (HD|UHD) Graphics( [2-6]\d\d)?\b|Mali-[GT][0-7]\d\b|Adreno \(TM\) [3-5]\d\d|PowerVR|Apple A(9|10|11)/i.test(s),u=a?"medium":"high";return(p||n<=4||l<=4)&&(u=a?"low":"medium"),(c||n<=2)&&(u="low"),{tier:u,mobile:a}}var wr=`
.cg-root{position:absolute;inset:0;overflow:hidden;color:#d9d4cc;font:500 12.5px/1.4 -apple-system,BlinkMacSystemFont,Inter,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.cg-poster{position:absolute;left:50%;top:0;height:100%;width:auto;min-width:100%;max-width:none;object-fit:cover;transform:translateX(-50%);pointer-events:none}
.cg-stage{position:absolute;inset:0;opacity:0;transition:opacity .8s ease}
.cg-ready .cg-stage{opacity:1}
.cg-lost .cg-stage,.cg-fallback .cg-stage{opacity:0}
.cg-canvas{display:block;width:100%;height:100%;touch-action:none}
.cg-ui{transition:opacity .5s}
.cg-root:not(.cg-ready) .cg-ui,.cg-fallback .cg-ui{opacity:0;pointer-events:none}
.cg-hint{position:absolute;top:max(16px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);margin:0;padding:6px 13px;border-radius:999px;color:rgba(230,224,214,.62);background:rgba(28,26,24,.42);border:1px solid rgba(255,255,255,.07);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);white-space:nowrap;pointer-events:none;letter-spacing:.02em;transition:opacity .8s;max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis}
.cg-hint.gone{opacity:0}
.cg-tools{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));display:flex;gap:9px}
.cg-root button{font:inherit;cursor:pointer;color:inherit}
.cg-round{width:40px;height:40px;padding:0;border-radius:50%;display:grid;place-items:center;background:rgba(32,30,28,.45);border:1px solid rgba(255,255,255,.08);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 4px 18px rgba(0,0,0,.35);transition:transform .15s,background .2s}
.cg-round:hover{transform:scale(1.06);background:rgba(44,42,40,.55)}
.cg-round:active{transform:scale(.94)}
.cg-round:focus-visible{outline:2px solid #e8a868;outline-offset:2px}
.cg-round svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.cg-round[aria-pressed='false'] .on,.cg-round[aria-pressed='true'] .off{display:none}
@container cg (max-width: 520px){.cg-hint{white-space:normal;text-align:center;width:max-content;border-radius:12px}}
.cg-root{container:cg/inline-size}
`,Er=`<div class="cg-ui">
  <p class="cg-hint">drag to look around \xB7 move through the smoke \xB7 tap to flick ash</p>
  <div class="cg-tools">
    <button class="cg-round" data-act="sound" aria-label="Sound" aria-pressed="false" title="Sound">
      <svg class="off" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
      <svg class="on" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>
    </button>
    <button class="cg-round" data-act="reset" aria-label="Reset view" title="Reset view"><svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg></button>
  </div>
</div>`;function Xr(t,e={}){let a=new URLSearchParams(location.search),s={quality:a.get("quality")||e.quality||"auto",poster:e.poster??null,debug:e.debug??a.has("debug"),workerUrl:e.workerUrl,dynres:a.get("dynres")!=="0"&&e.dynamicResolution!==!1},n=matchMedia("(prefers-reduced-motion: reduce)").matches,l=!1,c=[],p=(F,H,ae,$)=>{F.addEventListener(H,ae,$),c.push(()=>F.removeEventListener(H,ae,$))},u={},g={destroy:Q,ready:null,get quality(){return u.tier||null}},h,v=performance.now(),y=[],C=()=>globalThis.scheduler?.yield?globalThis.scheduler.yield():new Promise(F=>setTimeout(F,0)),I=()=>v=performance.now();return g.ready=K().catch(F=>{l||console.error("still life:",F),h?.classList.add("cg-fallback")}),g;async function K(){let F=performance.now(),H=o=>{let i=performance.now();y.push({step:o,ms:i-F}),F=i};getComputedStyle(t).position==="static"&&(t.style.position="relative"),h=document.createElement("div"),h.className="cg-root";let ae=document.createElement("style");if(ae.textContent=wr,h.appendChild(ae),s.poster){let o=document.createElement("img");o.className="cg-poster",o.alt="",o.src=s.poster,h.appendChild(o)}let $=document.createElement("div");$.className="cg-stage",h.appendChild($),h.insertAdjacentHTML("beforeend",Er),t.appendChild(h);let Ie=br(),j=!ra[s.quality],R={...ra[j?Ie.tier:s.quality]};u.tier=R.name;let E;try{E=new as({antialias:!1,powerPreference:"high-performance"})}catch{h.classList.add("cg-fallback");return}let L=1,de=()=>Math.min(window.devicePixelRatio||1,R.dpr);E.setPixelRatio(de()),E.outputColorSpace=Vo,E.toneMapping=Fa,E.toneMappingExposure=1,E.shadowMap.enabled=!0,E.shadowMap.type=Aa,E.shadowMap.autoUpdate=!1;let G=E.domElement;G.className="cg-canvas",G.setAttribute("role","img"),G.setAttribute("aria-label","A cigarette burning in a hand-thrown stoneware ashtray on a dark walnut table, its smoke curling up through a beam of light."),$.appendChild(G);let Ce=(()=>{try{return new Worker(s.workerUrl,{type:"module"})}catch{return null}})();Ce&&c.push(()=>Ce.terminate());let xe=0,ye=new Map;Ce&&(Ce.onmessage=o=>{ye.get(o.data.id)?.(o.data),ye.delete(o.data.id)});let Re=o=>Ce?new Promise(i=>{let r=++xe;ye.set(r,i),Ce.postMessage({...o,id:r})}):Promise.reject(new Error("no worker")),Fe=Re({type:"tray",h:R.trayH}),vo=Re({type:"bake"}),De=Re({type:"curl"}),P=new so;P.fog=new Na(0,.0011);let M=new Ja(24,1,6,5e3);function ut(){let o=new so;o.background=new oe(.006,.006,.007);let i=new Zo(1,1),r=(B,we,fe,Ze,Ue)=>{let St=new io({color:new oe(...Ue).multiplyScalar(Ze),side:to}),it=new ie(i,St);return it.scale.set(B,we,1),it.position.set(...fe),it.lookAt(0,0,0),o.add(it),St},m=[r(500,2600,[-1700,1500,900],2.4,[1,.88,.76]),r(1800,260,[700,1600,-1800],.7,[.7,.8,1])],f=new os(E),x=f.fromScene(o,0,10,6e3).texture;f.dispose(),i.dispose();for(let B of m)B.dispose();return x}H("renderer");let Ne=ut();H("environment (PMREM)"),await C(),P.environment=Ne,P.environmentIntensity=.55;let ot=[0,1,2].map(o=>ps(o));function bo(o,i){let r=ot[o],m=new w(-r.dir[0],0,-r.dir[2]),f=re.degToRad(4.5),x=m.clone().multiplyScalar(Math.cos(f)).add(new w(0,-Math.sin(f),0)).normalize(),B=te.bowlTop+2.3,Ze=new w(r.dir[0]*B,r.y+Se.radius+.05,r.dir[2]*B).clone().addScaledVector(x,-35),Ue=new w(0,1,0),St=new w().crossVectors(x,Ue).normalize(),it=new w().crossVectors(St,x).normalize();return i.makeBasis(x,it,St).setPosition(Ze),i}let J=(await vo).tex;if(H("textures baked (worker)"),l)return;let wo=Math.min(8,E.capabilities.getMaxAnisotropy()),Xe=[];function Le(o,i,r,m=!0){let f=new no(i,o.size,o.size);return m&&(f.wrapS=f.wrapT=Rt),f.magFilter=Dt,f.minFilter=za,f.generateMipmaps=!0,f.anisotropy=wo,r&&(f.colorSpace=Vo),f.needsUpdate=!0,Xe.push(f),f}let ce={walnut:Le(J.walnut,J.walnut.px,!0),walnutN:Le(J.walnut,J.walnut.nrm,!1),walnutR:Le(J.walnut,J.walnut.rough,!1),speckle:Le(J.speckle,J.speckle.px,!1),cork:Le(J.cork,J.cork.px,!0),paper:Le(J.paper,J.paper.px,!1),fibre:Le(J.fibre,J.fibre.px,!1)},d={uTime:{value:0},uEmber:{value:1}},T=new _e({map:ce.walnut,normalMap:ce.walnutN,roughnessMap:ce.walnutR,roughness:1,clearcoat:.22,clearcoatRoughness:.32,normalScale:new _(.6,.6)});for(let o of[ce.walnut,ce.walnutN,ce.walnutR])o.repeat.set(6,6);T.onBeforeCompile=o=>{o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vWp;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vWp;`).replace("#include <fog_fragment>",`gl_FragColor.rgb *= smoothstep(470.0, 150.0, length(vWp.xz));
#include <fog_fragment>`)};let A=new ie(new Zo(2400,2400).rotateX(-Math.PI/2),T);A.receiveShadow=!0,P.add(A);let k=new _e({color:16777215,roughness:.6,clearcoat:1,clearcoatRoughness:.06,vertexColors:!0});k.onBeforeCompile=o=>{o.uniforms.tSpeck={value:ce.speckle},o.uniforms.uFloor={value:te.floor},o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aZone;
varying vec2 vZone;
varying vec3 vOP;
varying vec3 vON;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vZone = aZone;
vOP = position;
vON = normal;`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
          varying vec2 vZone; varying vec3 vOP; varying vec3 vON;
          uniform sampler2D tSpeck; uniform float uFloor;
          float trayInterior; float trayRaw; float trayDust; float trayPool;
          vec4 triplanar(sampler2D t, vec3 p, vec3 n, float s) {
            vec3 w = pow(abs(n), vec3(4.0)); w /= dot(w, vec3(1.0));
            return texture2D(t, p.yz * s) * w.x + texture2D(t, p.zx * s) * w.y + texture2D(t, p.xy * s) * w.z;
          }`).replace("#include <color_fragment>",`#include <color_fragment>
          vec4 sp = triplanar(tSpeck, vOP, normalize(vON), 0.022);
          vec4 sp2 = triplanar(tSpeck, vOP, normalize(vON), 0.09);
          trayInterior = vZone.x;
          trayRaw = vZone.y;
          float r = length(vOP.xz);
          // the inner glaze pools deeper and glassier towards the floor; it thins and breaks amber over the rim
          trayPool = smoothstep(uFloor + 9.0, uFloor + 0.5, vOP.y);
          float thin = smoothstep(26.0, 31.5, vOP.y) * (1.0 - trayPool);
          vec3 inner = mix(vec3(0.075, 0.052, 0.04), vec3(0.028, 0.022, 0.02), trayPool);
          inner = mix(inner, vec3(0.32, 0.19, 0.09), thin * (0.45 + 0.4 * sp.g));
          // outside: warm grey, mottled, iron speckles
          vec3 outer = vec3(0.47, 0.44, 0.405) * (0.88 + 0.22 * sp.g);
          outer = mix(outer, vec3(0.2, 0.12, 0.07), clamp(sp2.r * 1.1, 0.0, 1.0));
          vec3 raw = vec3(0.6, 0.5, 0.39) * (0.85 + 0.25 * sp2.b);
          vec3 c = mix(outer, inner, trayInterior);
          c = mix(c, raw, trayRaw);
          // fine ash dust settled on the floor of the bowl: thickest a little off centre, specks
          // and soot smudges, thinning out towards the walls
          float dens = smoothstep(27.0, 5.0, length(vOP.xz - vec2(4.0, -3.0))) * (0.4 + 0.6 * smoothstep(0.3, 0.72, sp.g));
          float specks = smoothstep(0.6, 0.8, sp2.b);
          trayDust = trayInterior * smoothstep(uFloor + 2.4, uFloor + 0.4, vOP.y) * clamp(dens * 0.5 + specks * dens * 0.55, 0.0, 0.8);
          vec3 dustCol = mix(vec3(0.34, 0.33, 0.32), vec3(0.11, 0.1, 0.095), smoothstep(0.55, 0.8, sp2.g));
          c = mix(c, dustCol, trayDust);
          diffuseColor.rgb = c * vColor.rgb;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
          roughnessFactor = mix(0.62 + 0.06 * sp2.b, mix(0.2, 0.07, trayPool), trayInterior);
          roughnessFactor = mix(roughnessFactor, 0.94, max(trayRaw, trayDust));`).replace("#include <lights_physical_fragment>",`#include <lights_physical_fragment>
          material.clearcoat = trayInterior * (1.0 - trayDust) * (1.0 - trayRaw);`).replace(/TRAY_BOTTOM/g,te.bowlBottom.toFixed(1))},k.customProgramCacheKey=()=>"tray";let z=new Yo(16766638,2.8,0,.42,.95,0);z.castShadow=!0,z.shadow.mapSize.set(R.shadow,R.shadow),z.shadow.camera.near=150,z.shadow.camera.far=900,z.shadow.bias=-4e-4,z.shadow.normalBias=.6,z.shadow.radius=5,P.add(z,z.target);let O=new Yo(11125503,1.4,0,.22,.6,0);P.add(O,O.target);let pe=new $a(2240578,788486,.09);P.add(pe);for(let o of[z,O,pe])o.layers.enableAll();await C();let je=await Fe;if(H("materials; ashtray meshed (worker)"),l)return;let he=je.mesh,U=new qe;U.setAttribute("position",new V(he.positions,3)),U.setAttribute("normal",new V(he.normals,3));let ge=new Float32Array(he.ao.length*3);for(let o=0;o<he.ao.length;o++)ge[o*3]=ge[o*3+1]=ge[o*3+2]=.45+.55*he.ao[o];U.setAttribute("color",new V(ge,3)),U.setAttribute("aZone",new V(he.zone,2)),U.setIndex(new V(he.indices,1));let ze=new ie(U,k);ze.castShadow=ze.receiveShadow=!0,P.add(ze),await C();let Ct=vs(R.segs),mt=bs(R.segs),Ps=ws(R.segs),As=Es(),N=[0,1].map(o=>{let i=sa(ce,d);i.u.uSeed.value=.3+o*.37;let r=new Ht;r.matrixAutoUpdate=!1;let m=new ie(Ct,i.body);m.castShadow=m.receiveShadow=!0,m.customDepthMaterial=i.bodyDepth,m.layers.enable(Ve.REGION);let f=new Ht,x=new ie(mt,i.ember),B=new ie(Ps,i.ash);B.position.x=.7,B.castShadow=B.receiveShadow=!0;let we=new ie(As,i.tobacco);f.add(x,B,we);for(let fe of[x,B,we])fe.layers.set(Ve.REGION);return r.add(m,f),P.add(r),{group:r,body:m,burn:f,ember:x,ash:B,mats:i,notch:o,b:64.5,ashLen:13,fallAt:15,lit:1,fade:o===0?1:0,state:o===0?"burning":"waiting"}}),ia=new ct;function Eo(o,i){o.notch=i,bo(i,ia),o.group.matrix.copy(ia),o.group.matrixWorldNeedsUpdate=!0}Eo(N[0],0),Eo(N[1],1),N[1].group.visible=!1;let He=0;function na(o){o.mats.u.uBurn.value=o.b,o.mats.u.uLit.value=o.lit,o.mats.u.uFade.value=o.fade,o.burn.position.x=o.b,o.ash.scale.x=Math.max(.001,o.ashLen/Se.ashMax),o.mats.u.uAshScale.value=o.ash.scale.x,o.ash.visible=o.ashLen>.05;let i=o.fade<.999;for(let r of[o.mats.body,o.mats.ash])r.transparent=i;o.ember.visible=o.lit>.01||o.fade>.01}H("cigarettes"),await C();let ft=sa(ce,{uTime:d.uTime,uEmber:{value:0}});ft.u.uBurn.value=29.6,ft.u.uLit.value=0;let xo=xs(R.segs),Ft=new ie(xo.geometry,ft.body);Ft.customDepthMaterial=ft.bodyDepth,Ft.castShadow=Ft.receiveShadow=!0;let dt=new ie(new jo(3.1,3),new _e({color:2762532,roughness:.96}));{let o=dt.geometry.attributes.position;for(let i=0;i<o.count;i++){let r=o.getX(i),m=o.getY(i),f=o.getZ(i),x=1+.22*le(r*.9,m*.9+2,f*.9);o.setXYZ(i,r*x*.75,m*x*.55,f*x)}dt.geometry.computeVertexNormals(),dt.position.copy(xo.end).addScaledVector(xo.endDir,-.4)}let Lt=new Ht;Lt.add(Ft,dt),Lt.position.set(-6,te.floor+Se.radius-.15,16),Lt.rotation.set(0,2.55,-.05),P.add(Lt);let yo=new _e({color:13149562,roughness:.78});yo.onBeforeCompile=o=>{o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
varying float vX;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vX = position.x;`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
varying float vX;`).replace("#include <color_fragment>",`#include <color_fragment>
float ch = smoothstep(20.0, 39.0, vX);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.008, 0.006, 0.005), ch);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.107, 0.033, 0.01), smoothstep(14.0, 20.0, vX) * (1.0 - ch) * 0.7);`)};let la=new ie(ys(),yo),To=new jo(1.6,3);{let o=To.attributes.position;for(let i=0;i<o.count;i++){let r=o.getX(i),m=o.getY(i),f=o.getZ(i),x=1+.2*le(r*1.4+3,m*1.4,f*1.4);o.setXYZ(i,r*1.35*x+42.4,m*x,f*x)}To.computeVertexNormals()}let Mo=new ie(To,new _e({color:1841689,roughness:.9,sheen:.4,sheenColor:new oe(.35,.34,.33)})),zt=new Ht;zt.add(la,Mo);for(let o of[la,Mo])o.castShadow=o.receiveShadow=!0;zt.position.set(-21,te.floor+1.08,-2),zt.rotation.set(0,.42,.035),P.add(zt),H("butt, match"),await C();let Te=48,ca=new _e({color:7236455,roughness:.97}),pt=new qa(Ts(),ca,Te);pt.instanceMatrix.setUsage(Va),pt.frustumCulled=!1,P.add(pt);for(let o of[T,k,ft.body,dt.material,yo,Mo.material,ca,...N.flatMap(i=>[i.mats.body,i.mats.ash,i.mats.tobacco])])us(o);let b={p:new Float32Array(Te*3),v:new Float32Array(Te*3),q:Array.from({length:Te},()=>new nt),w:new Float32Array(Te*3),s:new Float32Array(Te),awake:new Uint8Array(Te),used:new Uint8Array(Te),next:0},ha=new ct,_o=new w,gt=new nt,So=new w,ks=new ao;function ua(o){So.set(b.p[o*3],b.p[o*3+1],b.p[o*3+2]),_o.setScalar(b.used[o]?b.s[o]:0),ha.compose(So,b.q[o],_o),pt.setMatrixAt(o,ha)}{let o=3,i=()=>(o=o*16807%2147483647)/2147483647;for(let r=0;r<9;r++){let m=i()*Math.PI*2,f=6+i()*20;b.p.set([Math.cos(m)*f,te.floor+.25,Math.sin(m)*f],r*3),b.q[r].setFromEuler(new ao(i()*.2,i()*6.28,i()*.2)),b.s[r]=.8+i()*1.2,b.used[r]=1}b.next=9;for(let r=0;r<Te;r++)ua(r)}let Ro=.25;function Cs(o,i,r,m){let f=kt(o,i,r);m[0]=kt(o+Ro,i,r)-f,m[1]=kt(o,i+Ro,r)-f,m[2]=kt(o,i,r+Ro)-f;let x=Math.hypot(m[0],m[1],m[2])||1;return m[0]/=x,m[1]/=x,m[2]/=x,f}let ue=new Float64Array(3),vt=0;function Fs(o){if(!vt)return!1;vt=0;for(let i=0;i<Te;i++){if(!b.awake[i])continue;let r=i*3;b.v[r+1]-=9810*.32*o;let m=Math.exp(-o*4);b.v[r]*=m,b.v[r+1]*=m,b.v[r+2]*=m,b.p[r]+=b.v[r]*o,b.p[r+1]+=b.v[r+1]*o,b.p[r+2]+=b.v[r+2]*o;let f=Cs(b.p[r],b.p[r+1],b.p[r+2],ue),x=!1;if(f<.25){let we=.25-f;b.p[r]+=ue[0]*we,b.p[r+1]+=ue[1]*we,b.p[r+2]+=ue[2]*we;let fe=b.v[r]*ue[0]+b.v[r+1]*ue[1]+b.v[r+2]*ue[2];fe<0&&(b.v[r]-=1.15*fe*ue[0],b.v[r+1]-=1.15*fe*ue[1],b.v[r+2]-=1.15*fe*ue[2]),x=!0}b.p[r+1]<.15&&(b.p[r+1]=.15,b.v[r+1]<0&&(b.v[r+1]*=-.1),x=!0),x&&(b.v[r]*=.6,b.v[r+2]*=.6,b.w[r]*=.5,b.w[r+1]*=.5,b.w[r+2]*=.5,gt.setFromUnitVectors(_o.set(0,1,0).applyQuaternion(b.q[i]),So.set(ue[0],ue[1],ue[2])),b.q[i].premultiply(gt.slerp(gt.identity(),.85))),gt.setFromEuler(ks.set(b.w[r]*o,b.w[r+1]*o,b.w[r+2]*o)),b.q[i].premultiply(gt);let B=Math.abs(b.v[r])+Math.abs(b.v[r+1])+Math.abs(b.v[r+2]);x&&B<6?b.awake[i]=0:vt++,ua(i)}return pt.instanceMatrix.needsUpdate=!0,!0}let Bt=new w;function ma(o,i){let r=Math.max(3,Math.round(o.ashLen*.7));for(let m=0;m<r;m++){let f=b.next;b.next=(b.next+1)%Te;let x=o.b+.5+m/r*o.ashLen;Bt.set(x,(Math.random()-.5)*3,(Math.random()-.5)*3).applyMatrix4(o.group.matrix),b.p.set([Bt.x,Bt.y,Bt.z],f*3),b.v.set([(Math.random()-.5)*60+i[0],-40-Math.random()*60+i[1],(Math.random()-.5)*60+i[2]],f*3),b.w.set([(Math.random()-.5)*12,(Math.random()-.5)*12,(Math.random()-.5)*12],f*3),b.q[f].setFromEuler(new ao(Math.random()*3,Math.random()*3,Math.random()*3)),b.s[f]=.9+Math.random()*1.3,b.used[f]=1,b.awake[f]=1,vt++}o.ashLen=0,o.fallAt=12+Math.random()*5}H("flakes");let Ut=(await De).curl;if(H("curl volume (worker)"),l)return;let ve=new Ia(Ut.data,Ut.size,Ut.size,Ut.size);ve.format=oo,ve.type=Ae,ve.wrapS=ve.wrapT=ve.wrapR=Rt,ve.minFilter=ve.magFilter=Dt,ve.unpackAlignment=1,ve.needsUpdate=!0,Xe.push(ve);let bt=new go,Y=new w,be={uTime:d.uTime,uHist:{value:bt.tex},uHistHead:{value:0},uViewDir:{value:new w},uCalm:{value:n?.35:1},uLife:{value:11},uHazeLife:{value:12},uPx:{value:500},uRimPos:{value:new w},uRimDir:{value:new w},uRimCone:{value:new _},uKeyPos:{value:new w},uCam:{value:new w},uBright:{value:1},uEmberPos:{value:new w},uEmberI:{value:1},uDepthZ:{value:null},uRes:{value:new _(1,1)},uCurl:{value:ve}},fa=Ds(R,be);H("smoke"),await C();let Ot=new so;Ot.add(fa.ribbons,fa.haze);function da(o,i){return i.set(o.b+.9,0,0).applyMatrix4(o.group.matrix)}da(N[0],Y),bt.fill([Y.x,Y.y,Y.z],1);let se={target:new w,pos:new w};{let o=Y;se.target.set(o.x*.6,o.y+26,o.z*.6);let i=ot[0],r=Math.atan2(i.dir[2],i.dir[0])+re.degToRad(118),m=300,f=re.degToRad(15);se.pos.set(se.target.x+Math.cos(r)*Math.cos(f)*m,se.target.y+Math.sin(f)*m,se.target.z+Math.sin(r)*Math.cos(f)*m);let x=new w().subVectors(se.target,se.pos).setY(0).normalize(),B=new w(x.z,0,-x.x);z.position.copy(o).addScaledVector(B,270).addScaledVector(x,-140).add(new w(0,310,0)),z.target.position.set(0,10,0),O.position.copy(o).addScaledVector(x,300).addScaledVector(B,-60).add(new w(0,62,0)),O.target.position.copy(o).add(new w(0,50,0)),z.target.updateMatrixWorld(),O.target.updateMatrixWorld()}be.uRimPos.value.copy(O.position),be.uRimDir.value.subVectors(O.target.position,O.position).normalize(),be.uRimCone.value.set(Math.cos(O.angle),Math.cos(O.angle*(1-O.penumbra))),be.uKeyPos.value.copy(z.position);let X=new ho(M,G);X.enableDamping=!0,X.dampingFactor=.07,X.minDistance=70,X.maxDistance=420,X.minPolarAngle=re.degToRad(8),X.maxPolarAngle=re.degToRad(86),X.enablePan=!1,X.rotateSpeed=.6,M.position.copy(se.pos),X.target.copy(se.target),X.update();let at=180,Vt={key:z.intensity,rim:O.intensity,fill:pe.intensity,env:P.environmentIntensity},It=0;function Ls(o){let i=o==="static"||o==="ember"?1:o==="region"?2:0;for(let m of N)m.mats.u.uPart.value=m===N[He]?i:0;let r=o==="ember";z.intensity=r?0:Vt.key,O.intensity=r?0:Vt.rim,pe.intensity=r?0:Vt.fill,P.environmentIntensity=r?0:Vt.env,Jo(Y,M,o==="static"?0:r?1:It/at,at)}let Me=cs({renderer:E,camera:M,Q:R,smokeScene:Ot,SU:be,setMode:Ls}),Z={still:!1,scene:P,emberI:0,dofK:0,regionBox:new Oe,emberBox:new Oe,smokeBox:new Oe,glow:{x:.5,y:.5,r:.05,col:new w},focus:{s:300,home:300},seed:0,truth:!1},wt=new w,q={x0:0,y0:0,x1:0,y1:0,behind:!1};function pa(){q.x0=q.y0=1/0,q.x1=q.y1=-1/0,q.behind=!1}function ga(o){o.project(M),(o.z>1||o.z<-1)&&(q.behind=!0);let i=o.x*.5+.5,r=o.y*.5+.5;i<q.x0&&(q.x0=i),i>q.x1&&(q.x1=i),r<q.y0&&(q.y0=r),r>q.y1&&(q.y1=r)}let Nt=o=>Math.min(1,Math.max(0,o));function va(o){return q.behind?o.set(0,0,1,1):o.set(Nt(q.x0),Nt(q.y0),Nt(q.x1),Nt(q.y1))}function ba(o,i,r,m,f){pa();for(let x=0;x<8;x++)ga(wt.set(x&1?r:i,x&2?m:-m-1.6,x&4?m:-m).applyMatrix4(o.group.matrix));return va(f)}function zs(o,i){pa();for(let r=0;r<8;r++)ga(wt.set(o.x+(r&1?120:-120),o.y+(r&2?260:-6),o.z+(r&4?120:-120)));return va(i)}let Do=new oe(16738852);function Et(){let o=Math.max(1,t.clientWidth),i=Math.max(1,t.clientHeight),r=de()*L;M.aspect=o/i;let m=Math.tan(re.degToRad(12))*Math.min(M.aspect,1.25);M.fov=re.radToDeg(2*Math.atan(m/M.aspect)),M.updateProjectionMatrix(),E.setPixelRatio(r),E.setSize(o,i,!1),E.getDrawingBufferSize(Ho),Me.setSize(Ho.x,Ho.y)}let Ho=new _,wa=new ResizeObserver(Et);wa.observe(t),c.push(()=>wa.disconnect()),Et();let Ea=n?0:(Se.length-Se.filter)/300,jt=0,Gt=0,Po=0;function Bs(o){let i=N[He];if(i.state==="burning")i.b-=Ea*o,i.ashLen=Math.min(Se.ashMax,i.ashLen+Ea*o*.92),i.ashLen>i.fallAt&&ma(i,[0,0,0]),i.b<=Se.filter+.8&&(i.state="out",Po=0);else if(i.state==="out"&&(Po+=o,i.lit=Math.max(0,i.lit-o/1.6),Po>3.5)){let r=N[1-He];Eo(r,(i.notch+1)%3),r.b=Se.length-2.5,r.ashLen=1.2,r.lit=1,r.fade=0,r.state="arriving",r.group.visible=!0,i.state="leaving",He=1-He,Pe=!0}for(let r of[0,1]){let m=N[r];m.state==="arriving"?(m.fade=Math.min(1,m.fade+o/1.6),m.fade>=1&&(m.state="burning"),Pe=!0):m.state==="leaving"&&(m.fade=Math.max(0,m.fade-o/1.6),m.fade<=0&&(m.state="waiting",m.group.visible=!1),Pe=!0),m.group.visible&&na(m)}}let S={x:0,y:0,inside:!1,world:new w,prev:new w,vel:new w,strength:0,has:!1},xt=new es;xt.layers.enableAll();let Zt=new _,xa=new ro,qt=new w;function Us(o,i,r){let m=G.getBoundingClientRect();return Zt.set((o-m.left)/m.width*2-1,-((i-m.top)/m.height)*2+1),xt.setFromCamera(Zt,M),M.getWorldDirection(qt),qt.y=0,qt.normalize(),xa.setFromNormalAndCoplanarPoint(qt,Y),xt.ray.intersectPlane(xa,r)}let yt={passive:!0};p(G,"pointermove",o=>{I(),S.x=o.clientX,S.y=o.clientY,S.inside=!0},yt),p(G,"pointerleave",()=>S.inside=!1,yt);let Wt=[0,0,0],Yt=[0,0,0],Kt=[0,0,0];function Os(o){if(S.inside&&Us(S.x,S.y,S.world)){S.has?(S.vel.subVectors(S.world,S.prev).divideScalar(Math.max(o,.001)),S.vel.length()>1500&&S.vel.setLength(1500)):S.vel.set(0,0,0),S.prev.copy(S.world),S.has=!0;let i=Math.min(1,S.vel.length()/350);S.strength+=(Math.max(i,S.strength*Math.exp(-o/1.2))-S.strength)*Math.min(1,o*8)}else S.has=!1,S.strength*=Math.exp(-o/1.2),S.vel.multiplyScalar(Math.exp(-o/.6))}let st=null,Ao=[];p(G,"wheel",I,yt),p(window,"keydown",I),p(G,"pointerdown",o=>{I(),st={x:o.clientX,y:o.clientY,t:performance.now()},Ns(),Mt()},yt),p(G,"pointerup",o=>{if(!st)return;let i=Math.hypot(o.clientX-st.x,o.clientY-st.y),r=performance.now()-st.t<320;if(st=null,i>6||!r)return;let m=G.getBoundingClientRect();Zt.set((o.clientX-m.left)/m.width*2-1,-((o.clientY-m.top)/m.height)*2+1),xt.setFromCamera(Zt,M);let f=N[He];Ao.length=0,xt.intersectObjects([f.body,f.ash,f.ember],!1,Ao),Ao.find(B=>B.object!==f.body||B.point.clone().applyMatrix4(Vs.copy(f.group.matrix).invert()).x<f.b+.5)&&f.state==="burning"&&ya(f)},yt);let Vs=new ct;function ya(o){let i=[0,0,0];o.ashLen>.3&&ma(o,i),Gt=1,jt=1,Qe.burst(1),u.lastFlick=performance.now()}let Qe={ctx:null,on:!1,buf:null,t:0,enable(o){if(this.on=o,o&&!this.ctx){let i=window.AudioContext||window.webkitAudioContext;if(!i)return;this.ctx=new i;let r=this.ctx.sampleRate;this.buf=this.ctx.createBuffer(1,r,r);let m=this.buf.getChannelData(0);for(let f=0;f<r;f++)m[f]=Math.random()*2-1}this.ctx&&(o&&Tt?this.ctx.resume():this.ctx.suspend())},burst(o){if(!this.on||!this.ctx||this.ctx.state!=="running")return;let i=this.ctx,r=i.createBufferSource();r.buffer=this.buf;let m=i.createBiquadFilter();m.type="bandpass",m.frequency.value=2200+Math.random()*4500,m.Q.value=.8;let f=i.createGain(),x=i.currentTime,B=(.015+Math.random()*.04)*o;f.gain.setValueAtTime(0,x),f.gain.linearRampToValueAtTime(B,x+.002),f.gain.exponentialRampToValueAtTime(1e-4,x+.02+Math.random()*.05),r.connect(m).connect(f).connect(i.destination),r.start(x,Math.random()*.9,.09)},step(o){!this.on||!this.ctx||(this.t-=o,this.t<=0&&(this.t=.04+Math.random()*.22,N[He].state==="burning"&&this.burst(.5+Math.random()*.5)))},close(){this.ctx?.close()}};c.push(()=>Qe.close());let Is=h.querySelector(".cg-hint"),Ta=!0;function Ns(){Ta&&(Ta=!1,setTimeout(()=>Is.classList.add("gone"),2500))}let me={on:!1};function js(){me.on=!0,me.t0=performance.now(),me.ms=n?1:1100,me.p0=M.position.clone(),me.q0=X.target.clone(),X.enableDamping=!1}function Gs(o){if(!me.on)return;let i=Math.min(1,(o-me.t0)/me.ms),r=i<.5?4*i*i*i:1-Math.pow(-2*i+2,3)/2;M.position.lerpVectors(me.p0,se.pos,r),X.target.lerpVectors(me.q0,se.target,r),i>=1&&(me.on=!1,X.enableDamping=!0)}for(let o of h.querySelectorAll("[data-act]"))p(o,"click",()=>{if(I(),o.dataset.act==="reset")js();else if(o.dataset.act==="sound"){let i=o.getAttribute("aria-pressed")!=="true";o.setAttribute("aria-pressed",String(i)),Qe.enable(i)}Mt()});let Tt=!0,Xt=!0,$e=0,Qt=performance.now(),Ma=0,Pe=!0,ko=0,$t=0,_a=!1,Sa=1e3/R.fps,Ge={sum:0,n:0,good:0},Ra=!0,Jt=0,Da=0,Co=0,Fo=new ct,Lo=new ct,Ha=(o,i)=>{for(let r=0;r<16;r++)if(Math.abs(o.elements[r]-i.elements[r])>1e-5*Math.max(1,Math.abs(o.elements[r])))return!1;return!0},Zs=9e3,rt={emberLight:1,cache:1,truth:0,freeze:0},Be=null;s.debug&&import("./ember-overlay-OPFBF3FI.js").then(o=>{l||(Be=o.createOverlay(h,E,()=>({tier:u.tier,scale:L,targets:Me.targets.length+(R.bloomReal?11:0)+2}),y),u.firstFrameAt&&(Be.stats.firstFrameAt=u.firstFrameAt,Be.report()))});function Mt(){!$e&&Tt&&_a&&!l&&($e=requestAnimationFrame(eo))}let qs=o=>.82+.1*Math.sin(o*1.3)+.07*le(o*2.7,.5,.5)+.05*le(o*9,3.1,.2);function eo(o){if($e=0,!Tt||l)return;let i=o-v>Zs&&!me.on;if((R.fps<60||i)&&o-Ma<1e3/30-2){$e=requestAnimationFrame(eo);return}let r=performance.now(),m=Math.min(.05,(o-Qt)/1e3);Qt=o,rt.freeze&&(m=0),Ma=o,$t+=m*(n?.35:1),d.uTime.value=$t,Gs(o),X.update(),Bs(m),Fs(m),Os(m),Qe.step(m),jt=Math.max(0,jt-m/1.1),Gt=Math.max(0,Gt-m/2.2);let f=N[He];d.uEmber.value=qs($t)+.9*jt,da(f,Y),It=at*d.uEmber.value*f.lit*f.fade*rt.emberLight,M.updateMatrixWorld(),Jo(Y,M,It/at,at),Kt[0]=Y.x,Kt[1]=Y.y,Kt[2]=Y.z,Wt[0]=S.world.x,Wt[1]=S.world.y,Wt[2]=S.world.z,Yt[0]=S.vel.x,Yt[1]=S.vel.y,Yt[2]=S.vel.z;let x=f.state==="leaving"||f.state==="waiting"?0:f.lit*f.fade;be.uHistHead.value=bt.advance(m,Kt,x,Wt,S.strength,Yt,Gt),be.uEmberPos.value.copy(Y),be.uEmberI.value=d.uEmber.value*x,M.getWorldDirection(be.uViewDir.value),be.uCam.value.copy(M.position),M.updateMatrixWorld();let B=Ra||!Ha(Fo,M.matrixWorld)||!Ha(Lo,M.projectionMatrix);Ra=!1;let we=B||me.on||vt>0||N.some(Ue=>Ue.state==="arriving"||Ue.state==="leaving")||!rt.cache;Co=we?0:Co+1;let fe=we||Co<4;ko+=m,Da+=m;let Ze=ko>2;if(Ze&&(ko=0),Z.focus.s=M.position.distanceTo(Y),Z.focus.home=se.pos.distanceTo(Y),Be?.begin(),fe?(Jt=0,Me.valid=!1,Fo.copy(M.matrixWorld),Lo.copy(M.projectionMatrix),(Pe||Ze)&&(E.shadowMap.needsUpdate=!0,Pe=!1)):((!Me.valid||Pe||Ze)&&(Me.bake(P,Z.focus,Pe||Ze||!Me.valid),Fo.copy(M.matrixWorld),Lo.copy(M.projectionMatrix),Pe=!1,Da=0,Be&&Be.bakes++),Jt=Math.min(1,Jt+m/.4)),Z.still=!fe,Z.truth=!!rt.truth,Z.emberI=It/at,Z.dofK=Jt,rt.freeze||(Z.seed=(Z.seed+.6180339)%7),ba(f,f.b-4.6,f.b+.7+f.ashLen+.8,4.7,Z.regionBox),ba(f,f.b-1.2,f.b+3.8,4.7,Z.emberBox),zs(Y,Z.smokeBox),R.bloomReal||(wt.copy(Y).project(M),Z.glow.x=wt.x*.5+.5,Z.glow.y=wt.y*.5+.5,Z.glow.r=7/(2*Z.focus.s*Math.tan(re.degToRad(M.fov/2))),Z.glow.col.set(Do.r,Do.g,Do.b).multiplyScalar(.3*Z.emberI)),Me.render(Z),Be?.end(performance.now()-r,fe?"full":"cached"),s.dynres&&(Ge.sum+=m*1e3,++Ge.n>=45)){let Ue=Ge.sum/Ge.n;Ge.sum=Ge.n=0,Ue>Sa*1.2&&L>.6?(L=L>.9?.85:L>.8?.72:.6,Et()):Ue<Sa*1.05&&L<1&&++Ge.good>=6&&(L=L<.65?.72:L<.8?.85:1,Ge.good=0,Et())}Mt()}function _t(o){o!==Tt&&(Tt=o,o?(Qt=performance.now(),Qe.enable(Qe.on),Mt()):($e&&cancelAnimationFrame($e),$e=0,Qe.ctx?.suspend()))}let Pa=new IntersectionObserver(o=>{Xt=o[o.length-1].isIntersecting,_t(Xt&&!document.hidden)});Pa.observe(t),c.push(()=>Pa.disconnect()),p(document,"visibilitychange",()=>_t(Xt&&!document.hidden)),p(G,"webglcontextlost",o=>{o.preventDefault(),_t(!1),h.classList.add("cg-lost")}),p(G,"webglcontextrestored",()=>{Ne.dispose(),Ne=ut(),P.environment=Ne,Pe=!0,bt.tex.needsUpdate=!0,ve.needsUpdate=!0,Me.valid=!1,h.classList.remove("cg-lost"),_t(Xt&&!document.hidden)});for(let o of N)na(o);let Ws=performance.now();if(N[1].group.visible=!0,H("post, controls, sound, loop"),await C(),M.layers.enableAll(),await E.compileAsync(P,M),M.layers.set(0),await E.compileAsync(Ot,M),N[1].group.visible=!1,!l){if(E.shadowMap.needsUpdate=!0,eo(performance.now()),await C(),eo(performance.now()),u.compileMs=performance.now()-Ws,H("shaders compiled, first frame"),u.firstFrameAt=performance.now(),h.classList.add("cg-ready"),_a=!0,Qt=performance.now(),Mt(),j){let o=performance.now(),i=0;await new Promise(f=>{let x=()=>{i++,performance.now()-o>1600||l?f():requestAnimationFrame(x)};requestAnimationFrame(x)});let r=(performance.now()-o)/Math.max(1,i),m=Hs.indexOf(u.tier);if(r>1e3/60*1.35&&m<2){let f=ra[Hs[m+1]];u.tier=f.name,R.dpr=f.dpr,R.fps=f.fps,R.smokeScale=f.smokeScale,R.bloomScale=f.bloomScale,R.dof=f.dof,R.bloomReal=R.bloomReal&&f.bloomReal,R.smaa=f.smaa,Et()}}s.debug&&(window.__still={THREE:ht,scene:P,camera:M,renderer:E,controls:X,cigs:N,api:u,handle:g,flick:()=>ya(N[He]),emberWorld:Y,ptr:S,SU:be,frameCache:Me,Q:R,key:z,rim:O,fill:pe,tableMat:T,trayMat:k,flags:rt,homePos:se.pos,homeTarget:se.target,setTime:o=>$t=o,burnTo:o=>{N[He].b=o,Me.valid=!1,Pe=!0},get overlay(){return Be}}),u.dispose=()=>{_t(!1),X.dispose();let o=new Set;for(let i of[P,Ot])i.traverse(r=>{r.geometry&&!o.has(r.geometry)&&o.add(r.geometry)&&r.geometry.dispose();let m=Array.isArray(r.material)?r.material:r.material?[r.material]:[];for(let f of m)o.has(f)||o.add(f)&&f.dispose()});for(let i of Xe)i.dispose();bt.dispose(),Ne.dispose(),z.shadow.dispose(),Me.dispose(),E.dispose(),E.forceContextLoss(),Be?.dispose()}}}function Q(){if(!l){l=!0;try{u.dispose?.()}finally{for(let F of c.splice(0))F();h?.remove(),window.__still?.handle===g&&delete window.__still}}}}export{ra as TIERS,Xr as createScene,br as guessTier};
