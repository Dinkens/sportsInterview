import { Scene, Mesh, Vector3, Texture, Color4, ParticleSystem } from "@babylonjs/core";

export class Coin {
    public _scene: Scene;

    public mesh: Mesh;
    public isTaken: boolean = false;

    //Particle System
    private _stars: ParticleSystem;

    constructor(mesh: Mesh, scene: Scene, position: Vector3) {
        this._scene = scene;

        //load the coin mesh
        this._loadcoin(mesh, position);

        //load particle system
        this._loadStars();
    }

    private _loadcoin(mesh: Mesh, position: Vector3): void {
        this.mesh = mesh;
        this.mesh.scaling = new Vector3(1, 1, 1);
        this.mesh.setAbsolutePosition(position);
        this.mesh.isPickable = false;
    }

    public deleteCoin(): void {
        this.isTaken = true;
        this._stars.start();
        this.mesh.dispose();
    }

    private _loadStars(): void {
        const particleSystem = new ParticleSystem("stars", 1000, this._scene);

        particleSystem.particleTexture = new Texture("textures/solidStar.png", this._scene);
        particleSystem.emitter = new Vector3(this.mesh.position.x, this.mesh.position.y + 1.5, this.mesh.position.z);
        particleSystem.createPointEmitter(new Vector3(0.6, 1, 0), new Vector3(0, 1, 0));
        particleSystem.color1 = new Color4(1, 1, 1);
        particleSystem.color2 = new Color4(1, 1, 1);
        particleSystem.colorDead = new Color4(1, 1, 1, 1);
        particleSystem.emitRate = 12;
        particleSystem.minEmitPower = 14;
        particleSystem.maxEmitPower = 14;
        particleSystem.addStartSizeGradient(0, 2);
        particleSystem.addStartSizeGradient(1, 0.8);
        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = 2;
        particleSystem.addDragGradient(0, 0.7, 0.7);
        particleSystem.targetStopDuration = .25;

        this._stars = particleSystem;
    }
}