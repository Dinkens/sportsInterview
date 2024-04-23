import { TextBlock, StackPanel, AdvancedDynamicTexture, Image, Button, Rectangle, Control, Grid } from "@babylonjs/gui";
import { Scene, Sound, PostProcess, Effect } from "@babylonjs/core";

export class Hud {
    private _scene: Scene;

    //Game Timer
    public time: number; //keep track to signal end game REAL TIME
    private _prevTime: number = 0;
    private _clockTime: TextBlock = null; //GAME TIME
    private _startTime: number;
    private _stopTimer: boolean;
    private _sString = "00";
    private _mString = 11;
    private _coinCnt: TextBlock;
    public coinAmount:number = 0;
    public moneyCntr: number = 0;

    //Pause toggle
    public gamePaused: boolean;

    //Quit game
    public quit: boolean;
    public transition: boolean = false;

    //UI Elements
    public pauseBtn: Button;
    public fadeLevel: number;
    private _playerUI;
    private _pauseMenu;
    private _controls;
    public tutorial;

    //Mobile
    public isMobile: boolean;
    public jumpBtn: Button;
    public dashBtn: Button;
    public leftBtn: Button;
    public rightBtn: Button;
    public upBtn: Button;
    public downBtn: Button;

    //Sounds
    public quitSfx: Sound;
    private _sfx: Sound;
    private _pause: Sound;
    private _sparkWarningSfx: Sound;

    constructor(scene: Scene) {

        this._scene = scene;

        const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        this._playerUI = playerUI;
        this._playerUI.idealHeight = 720;

        const coinCnt = new TextBlock();
        coinCnt.name = "coin count";
        coinCnt.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_CENTER;
        coinCnt.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        coinCnt.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        coinCnt.fontSize = "22px";
        coinCnt.color = "white";
        coinCnt.text = `coins: ${this.coinAmount} / 20`;
        coinCnt.top = "32px";
        coinCnt.left = "-64px";
        coinCnt.width = "25%";
        coinCnt.fontFamily = "Viga";
        coinCnt.resizeToFit = true;
        playerUI.addControl(coinCnt);
        this._coinCnt = coinCnt;

        const stackPanel = new StackPanel();
        stackPanel.height = "100%";
        stackPanel.width = "100%";
        stackPanel.top = "14px";
        stackPanel.verticalAlignment = 0;
        playerUI.addControl(stackPanel);

        //Game timer text
        const clockTime = new TextBlock();
        clockTime.name = "clock";
        clockTime.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
        clockTime.fontSize = "48px";
        clockTime.color = "white";
        clockTime.text = "11:00";
        clockTime.resizeToFit = true;
        clockTime.height = "96px";
        clockTime.width = "220px";
        clockTime.fontFamily = "Viga";
        stackPanel.addControl(clockTime);
        this._clockTime = clockTime;

        const pauseBtn = Button.CreateImageOnlyButton("pauseBtn", "./sprites/pauseBtn.png");
        pauseBtn.width = "48px";
        pauseBtn.height = "86px";
        pauseBtn.thickness = 0;
        pauseBtn.verticalAlignment = 0;
        pauseBtn.horizontalAlignment = 1;
        pauseBtn.top = "-16px";
        playerUI.addControl(pauseBtn);
        pauseBtn.zIndex = 10;
        this.pauseBtn = pauseBtn;
        //when the button is down, make pause menu visable and add control to it
        pauseBtn.onPointerDownObservable.add(() => {
            this._pauseMenu.isVisible = true;
            playerUI.addControl(this._pauseMenu);
            this.pauseBtn.isHitTestVisible = false;

            //when game is paused, make sure that the next start time is the time it was when paused
            this.gamePaused = true;
            this._prevTime = this.time;

            //--SOUNDS--
            this._scene.getSoundByName("gameSong").pause();
            this._pause.play(); //play pause music
        });

        const tutorial = new Rectangle();
        tutorial.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        tutorial.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        tutorial.top = "12%";
        tutorial.left = "-1%";
        tutorial.height = 0.2;
        tutorial.width = 0.2;
        tutorial.thickness = 0;
        tutorial.alpha = 0.6;
        this._playerUI.addControl(tutorial);
        this.tutorial = tutorial;
        //movement image, will disappear once you attempt all of the moves
        let movementPC = new Image("pause", "sprites/tutorial.png");
        tutorial.addControl(movementPC);

        this._createPauseMenu();
        this._createControlsMenu();
        this._loadSounds(scene);

        //Check if Mobile, add button controls
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            this.isMobile = true; // tells inputController to track mobile inputs

            movementPC.isVisible = false;
            let movementMobile = new Image("pause", "sprites/tutorialMobile.png");
            tutorial.addControl(movementMobile);
            //--ACTION BUTTONS--
            // container for action buttons (right side of screen)
            const actionContainer = new Rectangle();
            actionContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            actionContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            actionContainer.height = 0.4;
            actionContainer.width = 0.2;
            actionContainer.left = "-2%";
            actionContainer.top = "-2%";
            actionContainer.thickness = 0;
            playerUI.addControl(actionContainer);

            //grid for action button placement
            const actionGrid = new Grid();
            actionGrid.addColumnDefinition(.5);
            actionGrid.addColumnDefinition(.5);
            actionGrid.addRowDefinition(.5);
            actionGrid.addRowDefinition(.5);
            actionContainer.addControl(actionGrid);

            const dashBtn = Button.CreateImageOnlyButton("dash", "./sprites/aBtn.png");
            dashBtn.thickness = 0;
            dashBtn.alpha = 0.8;
            dashBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            this.dashBtn = dashBtn;

            const jumpBtn = Button.CreateImageOnlyButton("jump", "./sprites/bBtn.png");
            jumpBtn.thickness = 0;
            jumpBtn.alpha = 0.8;
            jumpBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            this.jumpBtn = jumpBtn;

            actionGrid.addControl(dashBtn, 0, 1);
            actionGrid.addControl(jumpBtn, 1, 0);

            //--MOVEMENT BUTTONS--
            // container for movement buttons (section left side of screen)
            const moveContainer = new Rectangle();
            moveContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            moveContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            moveContainer.height = 0.4;
            moveContainer.width = 0.4;
            moveContainer.left = "2%";
            moveContainer.top = "-2%";
            moveContainer.thickness = 0;
            playerUI.addControl(moveContainer);

            //grid for placement of arrow keys
            const grid = new Grid();
            grid.addColumnDefinition(.4);
            grid.addColumnDefinition(.4);
            grid.addColumnDefinition(.4);
            grid.addRowDefinition(.5);
            grid.addRowDefinition(.5);
            moveContainer.addControl(grid);

            const leftBtn = Button.CreateImageOnlyButton("left", "./sprites/arrowBtn.png");
            leftBtn.thickness = 0;
            leftBtn.rotation = -Math.PI / 2;
            leftBtn.color = "white";
            leftBtn.alpha = 0.8;
            leftBtn.width = 0.8;
            leftBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            this.leftBtn = leftBtn;

            const rightBtn = Button.CreateImageOnlyButton("right", "./sprites/arrowBtn.png");
            rightBtn.rotation = Math.PI / 2;
            rightBtn.thickness = 0;
            rightBtn.color = "white";
            rightBtn.alpha = 0.8;
            rightBtn.width = 0.8;
            rightBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            this.rightBtn = rightBtn;

            const upBtn = Button.CreateImageOnlyButton("up", "./sprites/arrowBtn.png");
            upBtn.thickness = 0;
            upBtn.alpha = 0.8;
            upBtn.color = "white";
            this.upBtn = upBtn;

            const downBtn = Button.CreateImageOnlyButton("down", "./sprites/arrowBtn.png");
            downBtn.thickness = 0;
            downBtn.rotation = Math.PI;
            downBtn.color = "white";
            downBtn.alpha = 0.8;
            this.downBtn = downBtn;

            //arrange the buttons in the grid
            grid.addControl(leftBtn, 1, 0);
            grid.addControl(rightBtn, 1, 2);
            grid.addControl(upBtn, 0, 1);
            grid.addControl(downBtn, 1, 1);

        }
    }


    public updateHud(): void {
        if (!this._stopTimer && this._startTime != null) {
            let curTime = Math.floor(( this._startTime - new Date().getTime()) / 1000) + this._prevTime; // divide by 1000 to get seconds
            console.log("new Date().getTime()", new Date().getTime())
            console.log("this._startTime", this._startTime)
            
            this.time = curTime; //keeps track of the total time elapsed in seconds
            this._clockTime.text = `${this.time}$`;
        }
    }

    public updateCoinCount(numCoins: number): void {
        this._coinCnt.text = "Coins: " + numCoins + " / 20";
        this._startTime += 10000;
    }
    //---- Game Timer ----
    public startTimer(): void {
        this._startTime = new Date().getTime() + 100000;
        this._stopTimer = false;
    }
    public stopTimer(): void {
        this._stopTimer = true;
    }

    //---- Pause Menu Popup ----
    private _createPauseMenu(): void {
        this.gamePaused = false;

        const pauseMenu = new Rectangle();
        pauseMenu.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        pauseMenu.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        pauseMenu.height = 0.8;
        pauseMenu.width = 0.5;
        pauseMenu.thickness = 0;
        pauseMenu.isVisible = false;

        //background image
        const image = new Image("pause", "sprites/pause.png");
        pauseMenu.addControl(image);

        //stack panel for the buttons
        const stackPanel = new StackPanel();
        stackPanel.width = .83;
        pauseMenu.addControl(stackPanel);

        const resumeBtn = Button.CreateSimpleButton("resume", "RESUME");
        resumeBtn.width = 0.18;
        resumeBtn.height = "44px";
        resumeBtn.color = "white";
        resumeBtn.fontFamily = "Viga";
        resumeBtn.paddingBottom = "14px";
        resumeBtn.cornerRadius = 14;
        resumeBtn.fontSize = "12px";
        resumeBtn.textBlock.resizeToFit = true;
        resumeBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        resumeBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        stackPanel.addControl(resumeBtn);

        this._pauseMenu = pauseMenu;

        //when the button is down, make menu invisable and remove control of the menu
        resumeBtn.onPointerDownObservable.add(() => {
            this._pauseMenu.isVisible = false;
            this._playerUI.removeControl(pauseMenu);
            this.pauseBtn.isHitTestVisible = true;
            
            //game unpaused, our time is now reset
            this.gamePaused = false;
            this._startTime = new Date().getTime();

            //--SOUNDS--
            this._scene.getSoundByName("gameSong").play();
            this._pause.stop();

            if(this._sparkWarningSfx.isPaused) {
                this._sparkWarningSfx.play();
            }
            this._sfx.play(); //play transition sound
        });

        const controlsBtn = Button.CreateSimpleButton("controls", "CONTROLS");
        controlsBtn.width = 0.18;
        controlsBtn.height = "44px";
        controlsBtn.color = "white";
        controlsBtn.fontFamily = "Viga";
        controlsBtn.paddingBottom = "14px";
        controlsBtn.cornerRadius = 14;
        controlsBtn.fontSize = "12px";
        resumeBtn.textBlock.resizeToFit = true;
        controlsBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        controlsBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

        stackPanel.addControl(controlsBtn);

        //when the button is down, make menu invisable and remove control of the menu
        controlsBtn.onPointerDownObservable.add(() => {
            //open controls screen
            this._controls.isVisible = true;
            this._pauseMenu.isVisible = false;

            //play transition sound
            this._sfx.play();
        });

        const quitBtn = Button.CreateSimpleButton("quit", "QUIT");
        quitBtn.width = 0.18;
        quitBtn.height = "44px";
        quitBtn.color = "white";
        quitBtn.fontFamily = "Viga";
        quitBtn.paddingBottom = "12px";
        quitBtn.cornerRadius = 14;
        quitBtn.fontSize = "12px";
        resumeBtn.textBlock.resizeToFit = true;
        quitBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        quitBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        stackPanel.addControl(quitBtn);

        //set up transition effect
        Effect.RegisterShader("fade",
            "precision highp float;" +
            "varying vec2 vUV;" +
            "uniform sampler2D textureSampler; " +
            "uniform float fadeLevel; " +
            "void main(void){" +
            "vec4 baseColor = texture2D(textureSampler, vUV) * fadeLevel;" +
            "baseColor.a = 1.0;" +
            "gl_FragColor = baseColor;" +
            "}");
        this.fadeLevel = 1.0;

        quitBtn.onPointerDownObservable.add(() => {
            const postProcess = new PostProcess("Fade", "fade", ["fadeLevel"], null, 1.0, this._scene.getCameraByName("cam"));
            postProcess.onApply = (effect) => {
                effect.setFloat("fadeLevel", this.fadeLevel);
            };
            this.transition = true;

            //--SOUNDS--
            this.quitSfx.play();
            if(this._pause.isPlaying){
                this._pause.stop();
            }
        })
    }

    //---- Controls Menu Popup ----
    private _createControlsMenu(): void {
        const controls = new Rectangle();
        controls.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        controls.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        controls.height = 0.8;
        controls.width = 0.5;
        controls.thickness = 0;
        controls.color = "white";
        controls.isVisible = false;
        this._playerUI.addControl(controls);
        this._controls = controls;

        //background image
        const image = new Image("controls", "sprites/controls.jpeg");
        controls.addControl(image);

        const backBtn = Button.CreateImageOnlyButton("back", "./sprites/coinbutton.png");
        backBtn.width = "40px";
        backBtn.height = "40px";
        backBtn.top = "14px";
        backBtn.thickness = 0;
        backBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        backBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        controls.addControl(backBtn);

        //when the button is down, make menu invisable and remove control of the menu
        backBtn.onPointerDownObservable.add(() => {
            this._pauseMenu.isVisible = true;
            this._controls.isVisible = false;

            //play transition sound
            this._sfx.play();
        });
    }


    //load all sounds needed for game ui interactions
    private _loadSounds(scene: Scene): void {
        this._pause = new Sound("pauseSong", "./sounds/Snowland.wav", scene, function () {
        }, {
            volume: 0.2
        });

        this._sfx = new Sound("selection", "./sounds/vgmenuselect.wav", scene, function () {
        });

        this.quitSfx = new Sound("quit", "./sounds/Retro Event UI 13.wav", scene, function () {
        });

        this._sparkWarningSfx = new Sound("sparkWarning", "./sounds/Retro Water Drop 01.wav", scene, function () {
        }, {
            loop: true,
            volume: 0.5,
            playbackRate: 0.6
        });
    }
}