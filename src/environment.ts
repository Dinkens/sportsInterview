import { Scene, Mesh, Vector3, Color3, TransformNode, SceneLoader, ParticleSystem, Color4, Texture, PBRMetallicRoughnessMaterial, VertexBuffer, AnimationGroup, Sound, ExecuteCodeAction, ActionManager, Tags, PointLight, DirectionalLight } from "@babylonjs/core";
import { Coin } from "./coin";
import { Player } from "./characterController";

export class Environment {
    private _scene: Scene;

    //Meshes
    private _coinObjs: Array<Coin>; //array of coins that need to be lit

    //fireworks
    private _fireworkObjs = [];
    private _startFireworks: boolean = false;

    constructor(scene: Scene) {
        this._scene = scene;
        this._coinObjs = [];

    }
    //What we do once the environment assets have been imported
    //handles setting the necessary flags for collision and trigger meshes,
    //sets up the coin objects
    //creates the firework particle systems for end-game
     public async load() {
       
        const assets = await this._loadAsset();
        //Loop through all environment meshes that were imported
        assets.allMeshes.forEach(m => {
            m.receiveShadows = true;
            m.checkCollisions = true;

            if (m.name == "ground") { //dont check for collisions, dont allow for raycasting to detect it(cant land on it)
                m.checkCollisions = false;
                m.isPickable = false;
            }
            //collision meshes
            if (m.name.includes("collision")) {
                m.isVisible = false;
                m.isPickable = true;
            }
            //trigger meshes
            if (m.name.includes("Trigger")) {
                m.isVisible = false;
                m.isPickable = false;
                m.checkCollisions = false;
            }
        });

        var light = new DirectionalLight("dir01", new Vector3(-1, -2, -1), this._scene);
	    light.position = new Vector3(20, 40, 20);

        //--COINS--
        assets.coin.isVisible = false; //original mesh is not visible
        //transform node to hold all coins
        const coinHolder = new TransformNode("coinHolder", this._scene);
        for (let i = 0; i < 41; i++) {
            //Mesh Cloning
            let coinInstance = assets.coin.clone("coin" + i); //bring in imported coin mesh & make clones
            coinInstance.isVisible = true;
            coinInstance.setParent(coinHolder);

            //Create the new coin object
            let newcoin = new Coin(coinInstance, this._scene, assets.env.getChildTransformNodes(false).find(m => m.name === "coin " + i).getAbsolutePosition());
            this._coinObjs.push(newcoin);
        }
        //dispose of original mesh and animation group that were cloned
        assets.coin.dispose();

        //--FIREWORKS--
        for (let i = 0; i < 60; i++) {
            this._fireworkObjs.push(new Firework(this._scene, i));
        }
        //before the scene renders, check to see if the fireworks have started
        //if they have, trigger the firework sequence
        this._scene.onBeforeRenderObservable.add(() => {
            this._fireworkObjs.forEach(f => {
                if (this._startFireworks) {
                    f._startFirework();
                }
            })
        })
     }


    //Load all necessary meshes for the environment
    public async _loadAsset() {
        //loads game environment
        const result = await SceneLoader.ImportMeshAsync(null, "./models/", "envSetting.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();

        //loads coin mesh
        const res = await SceneLoader.ImportMeshAsync("", "./models/", "coinSilver.glb", this._scene);

        //extract the actual coin mesh from the root of the mesh that's imported, dispose of the root
        let coin = res.meshes[0].getChildren()[0];
        coin.parent = null;
        res.meshes[0].dispose();

        return {
            env: env,
            allMeshes: allMeshes,
            coin: coin as Mesh,
        }
    }

    public checkcoins(player: Player) {
        this._coinObjs.forEach(coin => {
            player.mesh.actionManager.registerAction(
                new ExecuteCodeAction(
                    {
                        trigger: ActionManager.OnIntersectionEnterTrigger,
                        parameter: coin.mesh
                    },
                    () => {
                        //if the coin is not lit, light it up & reset sparkler timer
                        if (!coin.isTaken) {
                            player.coinIsTaken = true
                            player.coinsTaken += 1;
                            coin.deleteCoin();

                            //SFX
                            player.pickUpSfx.play();
                        }
                    }
                )
            );
        });
    }
}

class Firework {
    private _scene:Scene;

    //variables used by environment
    private _emitter: Mesh;
    private _rocket: ParticleSystem;
    private _exploded: boolean = false;
    private _height: number;
    private _delay: number;
    private _started: boolean;

    //sounds
    private _explosionSfx: Sound;
    private _rocketSfx: Sound;

    constructor(scene: Scene, i: number) {
        this._scene = scene;
        //Emitter for rocket of firework
        const sphere = Mesh.CreateSphere("rocket", 4, 1, scene);
        sphere.isVisible = false;
        //the origin spawn point for all fireworks is determined by a TransformNode called "fireworks", this was placed in blender
        let randPos = Math.random() * 10;
        sphere.position = (new Vector3(scene.getTransformNodeByName("fireworks").getAbsolutePosition().x + randPos * -1, scene.getTransformNodeByName("fireworks").getAbsolutePosition().y, scene.getTransformNodeByName("fireworks").getAbsolutePosition().z));
        this._emitter = sphere;

        //Rocket particle system
        let rocket = new ParticleSystem("rocket", 350, scene);
        rocket.particleTexture = new Texture("./textures/flare.png", scene);
        rocket.emitter = sphere;
        rocket.emitRate = 20;
        rocket.minEmitBox = new Vector3(0, 0, 0);
        rocket.maxEmitBox = new Vector3(0, 0, 0);
        rocket.color1 = new Color4(0.49, 0.57, 0.76);
        rocket.color2 = new Color4(0.29, 0.29, 0.66);
        rocket.colorDead = new Color4(0, 0, 0.2, 0.5);
        rocket.minSize = 1;
        rocket.maxSize = 1;
        rocket.addSizeGradient(0, 1);
        rocket.addSizeGradient(1, 0.01);
        this._rocket = rocket;
        
        //set how high the rocket will travel before exploding and how long it'll take before shooting the rocket
        this._height = sphere.position.y + Math.random() * (15 + 4) + 4;
        this._delay = (Math.random() * i + 1) * 60; //frame based

        this._loadSounds();
    }

    private _explosions(position: Vector3): void {
        //mesh that gets split into vertices
        const explosion = Mesh.CreateSphere("explosion", 4, 1, this._scene);
        explosion.isVisible = false;
        explosion.position = position;

        let emitter = explosion;
        emitter.useVertexColors = true;
        let vertPos = emitter.getVerticesData(VertexBuffer.PositionKind);
        let vertNorms = emitter.getVerticesData(VertexBuffer.NormalKind);
        let vertColors = [];

        //for each vertex, create a particle system
        for (let i = 0; i < vertPos.length; i += 3) {
            let vertPosition = new Vector3(
                vertPos[i], vertPos[i + 1], vertPos[i + 2]
            )
            let vertNormal = new Vector3(
                vertNorms[i], vertNorms[i + 1], vertNorms[i + 2]
            )
            let r = Math.random();
            let g = Math.random();
            let b = Math.random();
            let alpha = 1.0;
            let color = new Color4(r, g, b, alpha);
            vertColors.push(r);
            vertColors.push(g);
            vertColors.push(b);
            vertColors.push(alpha);

            //emitter for the particle system
            let gizmo = Mesh.CreateBox("gizmo", 0.001, this._scene);
            gizmo.position = vertPosition;
            gizmo.parent = emitter;
            let direction = vertNormal.normalize().scale(1); // move in the direction of the normal

            //actual particle system for each exploding piece
            const particleSys = new ParticleSystem("particles", 500, this._scene);
            particleSys.particleTexture = new Texture("textures/flare.png", this._scene);
            particleSys.emitter = gizmo;
            particleSys.minEmitBox = new Vector3(1, 0, 0);
            particleSys.maxEmitBox = new Vector3(1, 0, 0);
            particleSys.minSize = .1;
            particleSys.maxSize = .1;
            particleSys.color1 = color;
            particleSys.color2 = color;
            particleSys.colorDead = new Color4(0, 0, 0, 0.0);
            particleSys.minLifeTime = 1;
            particleSys.maxLifeTime = 2;
            particleSys.emitRate = 500;
            particleSys.gravity = new Vector3(0, -9.8, 0);
            particleSys.direction1 = direction;
            particleSys.direction2 = direction;
            particleSys.minEmitPower = 10;
            particleSys.maxEmitPower = 13;
            particleSys.updateSpeed = 0.01;
            particleSys.targetStopDuration = 0.2;
            particleSys.disposeOnStop = true;
            particleSys.start();
        }

        emitter.setVerticesData(VertexBuffer.ColorKind, vertColors);
    }

    private _startFirework(): void {

        if(this._started) { //if it's started, rocket flies up to height & then explodes
            if (this._emitter.position.y >= this._height && !this._exploded) {
                //--sounds--
                this._explosionSfx.play();
                //transition to the explosion particle system
                this._exploded = !this._exploded; // don't allow for it to explode again
                this._explosions(this._emitter.position);
                this._emitter.dispose();
                this._rocket.stop();
            } else {
                //move the rocket up
                this._emitter.position.y += .2;
            }
        } else {
            //use its delay to know when to shoot the firework
            if(this._delay <= 0){
                this._started = true;
                //--sounds--
                this._rocketSfx.play();
                //start particle system
                this._rocket.start();
            } else {
                this._delay--;
            }
        }
    }

    private _loadSounds(): void {
        this._rocketSfx = new Sound("selection", "./sounds/fw_05.wav", this._scene, function () {
        }, {
            volume: 0.5,
        });

        this._explosionSfx = new Sound("selection", "./sounds/fw_03.wav", this._scene, function () {
        }, {
            volume: 0.5,
        });
    }
}