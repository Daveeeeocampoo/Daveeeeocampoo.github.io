const menuButton = document.getElementById("menu-button");
const navigation = document.getElementById("nav-links");
const navigationLinks = document.querySelectorAll(".nav-links a");
const currentYear = document.getElementById("current-year");
const themePicker = document.querySelector(".theme-picker");
const themeToggle = document.getElementById("theme-toggle");
const themeMenu = document.getElementById("theme-menu");
const themeOptions = document.querySelectorAll(".theme-option");
const availableThemes = ["red", "pink", "blue", "green", "purple"];
const themeStorageKey = "portfolio-theme";

function setNavigationOpen(isOpen) {
    navigation.classList.toggle("open", isOpen);
    menuButton.textContent = isOpen ? "✕" : "☰";
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    menuButton.setAttribute("aria-expanded", String(isOpen));
}

function setThemeMenuOpen(isOpen) {
    themeMenu.hidden = !isOpen;
    themeToggle.setAttribute("aria-expanded", String(isOpen));
}

function applyTheme(theme, savePreference) {
    const selectedTheme = availableThemes.includes(theme) ? theme : "blue";

    document.documentElement.dataset.theme = selectedTheme;

    themeOptions.forEach(function (option) {
        option.setAttribute("aria-pressed", String(option.dataset.theme === selectedTheme));
    });

    if (savePreference) {
        try {
            localStorage.setItem(themeStorageKey, selectedTheme);
        } catch (error) {
            // The theme still applies for this visit if storage is unavailable.
        }
    }
}

menuButton.addEventListener("click", function () {
    setThemeMenuOpen(false);
    setNavigationOpen(!navigation.classList.contains("open"));
});

navigationLinks.forEach(function (link) {
    link.addEventListener("click", function () {
        setNavigationOpen(false);
    });
});

themeToggle.addEventListener("click", function () {
    const shouldOpen = themeMenu.hidden;

    setNavigationOpen(false);
    setThemeMenuOpen(shouldOpen);
});

themeOptions.forEach(function (option) {
    option.addEventListener("click", function () {
        applyTheme(option.dataset.theme, true);
        setThemeMenuOpen(false);
        themeToggle.focus();
    });
});

document.addEventListener("click", function (event) {
    if (!themePicker.contains(event.target)) {
        setThemeMenuOpen(false);
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        const themeMenuWasOpen = !themeMenu.hidden;

        setThemeMenuOpen(false);
        setNavigationOpen(false);

        if (themeMenuWasOpen) {
            themeToggle.focus();
        }
    }
});

window.addEventListener("resize", function () {
    if (window.innerWidth > 650) {
        setNavigationOpen(false);
    }
});

applyTheme(document.documentElement.dataset.theme || "blue", false);

currentYear.textContent = new Date().getFullYear();

function initializePlvPendulum() {
    const stage = document.getElementById("plv-pendulum-stage");
    const pendulum = document.getElementById("plv-pendulum-object");
    const pendulumSlider = document.getElementById("plv-pendulum-slider");
    const cardRotor = document.getElementById("plv-card-rotor");
    const hero = document.getElementById("home");

    if (!stage || !pendulum || !pendulumSlider || !cardRotor || !hero) {
        return;
    }

    const lanyardImage = pendulum.querySelector(".plv-lanyard-image");
    const cardShell = pendulum.querySelector(".plv-card-shell");
    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );
    const fixedTimeStep = 1 / 120;
    const maximumFrameTime = 0.05;
    const maximumSubsteps = 6;
    const gravity = 1700;
    const centeringSpring = 0.2;
    const angularDamping = 0.62;
    const airResistance = 0.12;
    const dragSpring = 44;
    const dragDamping = 9;
    const verticalSpringStiffness = 45;
    const verticalSpringDamping = 6.5;
    const verticalDragSpring = 60;
    const verticalDragDamping = 11;
    const maximumVerticalVelocity = 900;
    const maximumCompression = 8;
    const maximumAngularVelocity = 3.2;
    const maximumTwistVelocity = 6;
    const maximumTiltX = 0.58;
    const maximumTiltY = 2.85;
    const state = {
        angle: 0,
        angularVelocity: 0,
        tiltX: 0,
        tiltY: 0,
        tiltVelocityX: 0,
        tiltVelocityY: 0,
    };
    const verticalSpring = {
        extension: 0,
        extensionVelocity: 0,
        restLength: 1,
        maxExtension: 1,
    };

    let anchorX = 0;
    let anchorY = 0;
    let horizontalRoom = 12;
    let maximumSwingAngle = 0.2;
    let initialized = false;
    let activeDrag = null;
    let pageIsVisible = !document.hidden;
    let heroIsVisible = true;
    let reducedMotion = reducedMotionQuery.matches;
    let animationFrame = 0;
    let resizeFrame = 0;
    let previousFrameTime = 0;
    let accumulator = 0;
    let settledSteps = 0;

    function clamp(value, minimum, maximum) {
        return Math.min(Math.max(value, minimum), maximum);
    }

    function normalizeAngle(angle) {
        let normalized = angle;

        while (normalized > Math.PI) normalized -= Math.PI * 2;
        while (normalized < -Math.PI) normalized += Math.PI * 2;
        return normalized;
    }

    function getPointerPosition(event) {
        const bounds = stage.getBoundingClientRect();

        return {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
        };
    }

    function getPointerAngle(pointer) {
        return Math.atan2(pointer.x - anchorX, pointer.y - anchorY);
    }

    function render() {
        pendulum.style.transform = `rotateZ(${state.angle}rad)`;
        pendulumSlider.style.transform =
            `translate3d(0, ${verticalSpring.extension}px, 0)`;
        cardRotor.style.transform =
            `rotateX(${state.tiltX}rad) rotateY(${state.tiltY}rad)`;
    }

    function stopAnimation() {
        if (animationFrame) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        }
    }

    function canAnimate() {
        return !reducedMotion && pageIsVisible && heroIsVisible;
    }

    function hasMotion() {
        return (
            activeDrag ||
            Math.abs(verticalSpring.extension) > 0.02 ||
            Math.abs(verticalSpring.extensionVelocity) > 0.02 ||
            Math.abs(state.angle) > 0.0005 ||
            Math.abs(state.angularVelocity) > 0.001 ||
            Math.abs(state.tiltX) > 0.001 ||
            Math.abs(state.tiltY) > 0.001 ||
            Math.abs(state.tiltVelocityX) > 0.002 ||
            Math.abs(state.tiltVelocityY) > 0.002
        );
    }

    function wakePhysics() {
        settledSteps = 0;

        if (!canAnimate() || animationFrame || !hasMotion()) {
            return;
        }

        previousFrameTime = performance.now();
        accumulator = 0;
        animationFrame = window.requestAnimationFrame(animationLoop);
    }

    function snapToRest() {
        state.angle = 0;
        state.angularVelocity = 0;
        state.tiltX = 0;
        state.tiltY = 0;
        state.tiltVelocityX = 0;
        state.tiltVelocityY = 0;
        verticalSpring.extension = 0;
        verticalSpring.extensionVelocity = 0;
        settledSteps = 0;
        render();
    }

    function updateMaximumSwingAngle() {
        const effectiveLength = Math.max(
            1,
            verticalSpring.restLength + verticalSpring.extension
        );

        maximumSwingAngle = clamp(
            Math.asin(clamp(horizontalRoom / effectiveLength, 0, 0.7)),
            0.1,
            0.42
        );
    }

    function constrainSwing() {
        if (state.angle < -maximumSwingAngle) {
            state.angle = -maximumSwingAngle;

            if (state.angularVelocity < 0) {
                state.angularVelocity *= -0.22;
            }
        } else if (state.angle > maximumSwingAngle) {
            state.angle = maximumSwingAngle;

            if (state.angularVelocity > 0) {
                state.angularVelocity *= -0.22;
            }
        }
    }

    function constrainTilt() {
        if (Math.abs(state.tiltX) > maximumTiltX) {
            state.tiltX = clamp(state.tiltX, -maximumTiltX, maximumTiltX);
            state.tiltVelocityX *= -0.2;
        }

        if (Math.abs(state.tiltY) > maximumTiltY) {
            state.tiltY = clamp(state.tiltY, -maximumTiltY, maximumTiltY);
            state.tiltVelocityY *= -0.2;
        }
    }

    function stepPendulum(deltaTime) {
        let verticalAcceleration;

        if (activeDrag) {
            verticalAcceleration =
                (activeDrag.targetExtension - verticalSpring.extension) *
                    verticalDragSpring -
                verticalSpring.extensionVelocity * verticalDragDamping;
        } else {
            const springForce =
                -verticalSpringStiffness * verticalSpring.extension;
            const dampingForce =
                -verticalSpringDamping *
                verticalSpring.extensionVelocity;

            verticalAcceleration = springForce + dampingForce;
        }

        verticalSpring.extensionVelocity = clamp(
            verticalSpring.extensionVelocity +
                verticalAcceleration * deltaTime,
            -maximumVerticalVelocity,
            maximumVerticalVelocity
        );
        verticalSpring.extension +=
            verticalSpring.extensionVelocity * deltaTime;

        if (verticalSpring.extension < -maximumCompression) {
            verticalSpring.extension = -maximumCompression;

            if (verticalSpring.extensionVelocity < 0) {
                verticalSpring.extensionVelocity *= -0.2;
            }
        } else if (
            verticalSpring.extension > verticalSpring.maxExtension
        ) {
            verticalSpring.extension = verticalSpring.maxExtension;

            if (verticalSpring.extensionVelocity > 0) {
                verticalSpring.extensionVelocity *= -0.15;
            }
        }

        updateMaximumSwingAngle();
        let angularAcceleration;

        if (activeDrag) {
            angularAcceleration =
                (activeDrag.targetAngle - state.angle) * dragSpring -
                state.angularVelocity * dragDamping;
        } else {
            const effectiveLength = Math.max(
                1,
                verticalSpring.restLength + verticalSpring.extension
            );
            const gravityAcceleration =
                -(gravity / effectiveLength) * Math.sin(state.angle);
            const springAcceleration = -centeringSpring * state.angle;
            const dampingAcceleration =
                -angularDamping * state.angularVelocity;
            const airResistanceAcceleration =
                -airResistance *
                state.angularVelocity *
                Math.abs(state.angularVelocity);

            angularAcceleration =
                gravityAcceleration +
                springAcceleration +
                dampingAcceleration +
                airResistanceAcceleration;
        }

        state.angularVelocity = clamp(
            state.angularVelocity + angularAcceleration * deltaTime,
            -maximumAngularVelocity,
            maximumAngularVelocity
        );
        state.angle += state.angularVelocity * deltaTime;
        constrainSwing();

        const targetTiltX = activeDrag ? activeDrag.targetTiltX : 0;
        const targetTiltY = activeDrag ? activeDrag.targetTiltY : 0;
        const tiltSpring = activeDrag ? 22 : 8;
        const tiltDamping = activeDrag ? 7.2 : 3.5;
        const tiltAccelerationX =
            (targetTiltX - state.tiltX) * tiltSpring -
            state.tiltVelocityX * tiltDamping;
        const tiltAccelerationY =
            (targetTiltY - state.tiltY) * tiltSpring -
            state.tiltVelocityY * tiltDamping;

        state.tiltVelocityX = clamp(
            state.tiltVelocityX + tiltAccelerationX * deltaTime,
            -maximumTwistVelocity,
            maximumTwistVelocity
        );
        state.tiltVelocityY = clamp(
            state.tiltVelocityY + tiltAccelerationY * deltaTime,
            -maximumTwistVelocity,
            maximumTwistVelocity
        );
        state.tiltX += state.tiltVelocityX * deltaTime;
        state.tiltY += state.tiltVelocityY * deltaTime;
        constrainTilt();

        if (activeDrag) {
            settledSteps = 0;
            return;
        }

        if (
            Math.abs(verticalSpring.extension) < 0.02 &&
            Math.abs(verticalSpring.extensionVelocity) < 0.04 &&
            Math.abs(state.angle) < 0.001 &&
            Math.abs(state.angularVelocity) < 0.0025 &&
            Math.abs(state.tiltX) < 0.002 &&
            Math.abs(state.tiltY) < 0.002 &&
            Math.abs(state.tiltVelocityX) < 0.006 &&
            Math.abs(state.tiltVelocityY) < 0.006
        ) {
            settledSteps += 1;
        } else {
            settledSteps = 0;
        }
    }

    function animationLoop(currentTime) {
        animationFrame = 0;

        if (!canAnimate()) {
            return;
        }

        const frameTime = Math.min(
            Math.max((currentTime - previousFrameTime) / 1000, 0),
            maximumFrameTime
        );
        previousFrameTime = currentTime;
        accumulator += frameTime;
        let substeps = 0;

        while (accumulator >= fixedTimeStep && substeps < maximumSubsteps) {
            stepPendulum(fixedTimeStep);
            accumulator -= fixedTimeStep;
            substeps += 1;
        }

        if (substeps === maximumSubsteps) {
            accumulator = 0;
        }

        render();

        if (!activeDrag && settledSteps >= 90) {
            snapToRest();
            return;
        }

        animationFrame = window.requestAnimationFrame(animationLoop);
    }

    function recalculateLayout() {
        const stageBounds = stage.getBoundingClientRect();
        const objectWidth = pendulum.offsetWidth;
        const lanyardHeight = lanyardImage.offsetHeight;
        const cardWidth = cardShell.offsetWidth;
        const cardHeight = cardShell.offsetHeight;

        if (
            stageBounds.width < 100 ||
            stageBounds.height < 100 ||
            objectWidth < 100 ||
            lanyardHeight < 100
        ) {
            return;
        }

        const wasReducedMotion = reducedMotion;
        const hiddenRatio =
            window.innerWidth <= 650
                ? 0.62
                : window.innerWidth <= 850
                    ? 0.6
                    : 0.58;

        reducedMotion = reducedMotionQuery.matches;
        stage.dataset.reducedMotion = String(reducedMotion);
        anchorX = stageBounds.width / 2;
        anchorY = -lanyardHeight * hiddenRatio;
        verticalSpring.restLength = lanyardHeight + cardHeight * 0.5;

        const desiredMaximumExtension =
            window.innerWidth <= 650
                ? 70
                : window.innerWidth <= 850
                    ? 110
                    : 130;
        const hiddenLaceLimit = Math.max(
            0,
            lanyardHeight * (hiddenRatio - 0.3)
        );
        verticalSpring.maxExtension = Math.min(
            desiredMaximumExtension,
            hiddenLaceLimit
        );
        verticalSpring.extension = clamp(
            verticalSpring.extension,
            -maximumCompression,
            verticalSpring.maxExtension
        );

        horizontalRoom = Math.max(
            12,
            Math.min(
                anchorX - cardWidth / 2 - 8,
                stageBounds.width - anchorX - cardWidth / 2 - 8
            )
        );
        updateMaximumSwingAngle();

        pendulum.style.left = `${anchorX - objectWidth / 2}px`;
        pendulum.style.top = `${anchorY}px`;
        state.angle = clamp(
            state.angle,
            -maximumSwingAngle,
            maximumSwingAngle
        );

        if (activeDrag) {
            activeDrag = null;
            pendulum.classList.remove("is-dragging");
        }

        if (!initialized) {
            initialized = true;

            if (!reducedMotion) {
                state.angularVelocity = 0.4;
            }
        } else if (reducedMotion) {
            stopAnimation();
            snapToRest();
        } else if (wasReducedMotion && !reducedMotion) {
            state.angularVelocity = 0.24;
        }

        render();
        wakePhysics();
    }

    function scheduleLayoutUpdate() {
        if (resizeFrame) {
            window.cancelAnimationFrame(resizeFrame);
        }

        resizeFrame = window.requestAnimationFrame(function () {
            resizeFrame = 0;
            recalculateLayout();
        });
    }

    function beginDrag(event) {
        const handle = event.target.closest(
            ".plv-lanyard-handle, .plv-card-shell"
        );

        if (
            !handle ||
            reducedMotion ||
            activeDrag ||
            (event.pointerType === "mouse" && event.button !== 0)
        ) {
            return;
        }

        event.preventDefault();
        const pointer = getPointerPosition(event);
        const pointerAngle = getPointerAngle(pointer);
        const pointerRadius = Math.hypot(
            pointer.x - anchorX,
            pointer.y - anchorY
        );

        activeDrag = {
            pointerId: event.pointerId,
            angleOffset: state.angle - pointerAngle,
            targetAngle: state.angle,
            targetExtension: verticalSpring.extension,
            targetTiltX: state.tiltX,
            targetTiltY: state.tiltY,
            startPointerRadius: pointerRadius,
            startExtension: verticalSpring.extension,
            lastX: pointer.x,
            lastY: pointer.y,
            lastPointerAngle: pointerAngle,
            lastPointerRadius: pointerRadius,
            lastTime: event.timeStamp,
            pointerVelocityX: 0,
            pointerVelocityY: 0,
            pointerAngularVelocity: 0,
            pointerRadialVelocity: 0,
            grabRadius: clamp(
                pointerRadius,
                verticalSpring.restLength * 0.35,
                verticalSpring.restLength + verticalSpring.maxExtension
            ),
        };
        pendulum.classList.add("is-dragging");

        try {
            pendulum.setPointerCapture(event.pointerId);
        } catch (error) {
            // Pointer capture is optional in older embedded browsers.
        }

        wakePhysics();
    }

    function moveDrag(event) {
        if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
            return;
        }

        event.preventDefault();
        const samples = event.getCoalescedEvents
            ? event.getCoalescedEvents()
            : [event];
        const latestEvent = samples[samples.length - 1] || event;
        const pointer = getPointerPosition(latestEvent);
        const pointerAngle = getPointerAngle(pointer);
        const pointerRadius = Math.hypot(
            pointer.x - anchorX,
            pointer.y - anchorY
        );
        const elapsedSeconds = Math.max(
            (latestEvent.timeStamp - activeDrag.lastTime) / 1000,
            0.001
        );
        const velocityX =
            (pointer.x - activeDrag.lastX) / elapsedSeconds;
        const velocityY =
            (pointer.y - activeDrag.lastY) / elapsedSeconds;
        const angularVelocity =
            normalizeAngle(pointerAngle - activeDrag.lastPointerAngle) /
            elapsedSeconds;
        const radialVelocity =
            (pointerRadius - activeDrag.lastPointerRadius) /
            elapsedSeconds;

        activeDrag.pointerVelocityX =
            activeDrag.pointerVelocityX * 0.58 + velocityX * 0.42;
        activeDrag.pointerVelocityY =
            activeDrag.pointerVelocityY * 0.58 + velocityY * 0.42;
        activeDrag.pointerAngularVelocity =
            activeDrag.pointerAngularVelocity * 0.58 +
            angularVelocity * 0.42;
        activeDrag.pointerRadialVelocity =
            activeDrag.pointerRadialVelocity * 0.58 +
            radialVelocity * 0.42;
        activeDrag.targetAngle = clamp(
            normalizeAngle(pointerAngle + activeDrag.angleOffset),
            -maximumSwingAngle,
            maximumSwingAngle
        );
        activeDrag.targetExtension = clamp(
            activeDrag.startExtension +
                pointerRadius - activeDrag.startPointerRadius,
            -maximumCompression,
            verticalSpring.maxExtension
        );
        activeDrag.targetTiltX = clamp(
            -activeDrag.pointerVelocityY * 0.0007,
            -maximumTiltX,
            maximumTiltX
        );
        activeDrag.targetTiltY = clamp(
            activeDrag.pointerVelocityX * 0.0032 +
                (activeDrag.targetAngle - state.angle) * 4,
            -maximumTiltY,
            maximumTiltY
        );
        activeDrag.lastX = pointer.x;
        activeDrag.lastY = pointer.y;
        activeDrag.lastPointerAngle = pointerAngle;
        activeDrag.lastPointerRadius = pointerRadius;
        activeDrag.lastTime = latestEvent.timeStamp;
        wakePhysics();
    }

    function endDrag(event, preserveMomentum) {
        if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
            return;
        }

        const pointerId = activeDrag.pointerId;

        if (preserveMomentum) {
            const tangentialVelocity =
                activeDrag.pointerVelocityX * Math.cos(state.angle) -
                activeDrag.pointerVelocityY * Math.sin(state.angle);
            const tangentialAngularVelocity =
                tangentialVelocity / activeDrag.grabRadius;
            const releaseAngularVelocity =
                activeDrag.pointerAngularVelocity * 0.55 +
                tangentialAngularVelocity * 0.45;

            verticalSpring.extensionVelocity = clamp(
                verticalSpring.extensionVelocity * 0.45 +
                    activeDrag.pointerRadialVelocity * 0.55,
                -maximumVerticalVelocity,
                maximumVerticalVelocity
            );
            state.angularVelocity = clamp(
                state.angularVelocity * 0.45 + releaseAngularVelocity * 0.55,
                -maximumAngularVelocity,
                maximumAngularVelocity
            );
            state.tiltVelocityX = clamp(
                state.tiltVelocityX -
                    activeDrag.pointerVelocityY * 0.0012,
                -maximumTwistVelocity,
                maximumTwistVelocity
            );
            state.tiltVelocityY = clamp(
                state.tiltVelocityY +
                    activeDrag.pointerVelocityX * 0.0024,
                -maximumTwistVelocity,
                maximumTwistVelocity
            );
        }

        activeDrag = null;
        pendulum.classList.remove("is-dragging");

        try {
            if (pendulum.hasPointerCapture(pointerId)) {
                pendulum.releasePointerCapture(pointerId);
            }
        } catch (error) {
            // The browser may already have released pointer capture.
        }

        wakePhysics();
    }

    pendulum.addEventListener("pointerdown", beginDrag, { passive: false });
    pendulum.addEventListener("pointermove", moveDrag, { passive: false });
    pendulum.addEventListener("pointerup", function (event) {
        event.preventDefault();
        endDrag(event, true);
    });
    pendulum.addEventListener("pointercancel", function (event) {
        endDrag(event, false);
    });
    pendulum.addEventListener("lostpointercapture", function (event) {
        if (activeDrag && event.pointerId === activeDrag.pointerId) {
            endDrag(event, true);
        }
    });
    pendulum.addEventListener("dragstart", function (event) {
        event.preventDefault();
    });

    document.addEventListener("visibilitychange", function () {
        pageIsVisible = !document.hidden;

        if (pageIsVisible) {
            wakePhysics();
        } else {
            stopAnimation();
        }
    });

    if ("IntersectionObserver" in window) {
        const heroObserver = new IntersectionObserver(
            function (entries) {
                heroIsVisible = entries[0].isIntersecting;

                if (heroIsVisible) {
                    wakePhysics();
                } else {
                    stopAnimation();
                }
            },
            { threshold: 0.01 }
        );
        heroObserver.observe(hero);
    }

    if ("ResizeObserver" in window) {
        const layoutObserver = new ResizeObserver(scheduleLayoutUpdate);
        layoutObserver.observe(stage);
        layoutObserver.observe(lanyardImage);
        layoutObserver.observe(cardShell);
    } else {
        window.addEventListener("resize", scheduleLayoutUpdate);
    }

    if (reducedMotionQuery.addEventListener) {
        reducedMotionQuery.addEventListener("change", scheduleLayoutUpdate);
    } else {
        reducedMotionQuery.addListener(scheduleLayoutUpdate);
    }

    window.addEventListener("orientationchange", scheduleLayoutUpdate);

    if (!lanyardImage.complete) {
        lanyardImage.addEventListener("load", scheduleLayoutUpdate, {
            once: true,
        });
    }

    recalculateLayout();
}

initializePlvPendulum();
