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

function initializePlvDragObject() {
    const stage = document.getElementById("plv-drag-stage");
    const dragObject = document.getElementById("plv-drag-object");
    const hero = document.getElementById("home");

    if (!stage || !dragObject || !hero) {
        return;
    }

    const lanyardImage = dragObject.querySelector(".plv-lanyard-image");
    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );
    const fixedTimeStep = 1 / 60;
    const maximumFrameTime = 0.05;
    const maximumSubsteps = 3;
    const edgePadding = 4;
    const maximumLinearVelocity = 1100;
    const maximumAngle = 0.13;
    const body = {
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        angle: 0,
        angularVelocity: 0,
    };
    const restPosition = { x: 0, y: 0 };

    let stageWidth = 0;
    let stageHeight = 0;
    let objectWidth = 0;
    let objectHeight = 0;
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

    function getMovementBounds() {
        return {
            minimumX: edgePadding,
            minimumY: edgePadding,
            maximumX: Math.max(
                edgePadding,
                stageWidth - objectWidth - edgePadding
            ),
            maximumY: Math.max(
                edgePadding,
                stageHeight - objectHeight - edgePadding
            ),
        };
    }

    function getPointerPosition(event) {
        const stageBounds = stage.getBoundingClientRect();

        return {
            x: event.clientX - stageBounds.left,
            y: event.clientY - stageBounds.top,
        };
    }

    function render() {
        dragObject.style.transform =
            `translate3d(${body.x}px, ${body.y}px, 0) ` +
            `rotate(${body.angle}rad)`;
    }

    function constrainBodyToStage(allowBounce) {
        const bounds = getMovementBounds();

        if (body.x < bounds.minimumX) {
            body.x = bounds.minimumX;

            if (allowBounce && body.velocityX < 0) {
                body.velocityX *= -0.38;
                body.angularVelocity += 0.16;
            } else {
                body.velocityX = Math.max(0, body.velocityX);
            }
        } else if (body.x > bounds.maximumX) {
            body.x = bounds.maximumX;

            if (allowBounce && body.velocityX > 0) {
                body.velocityX *= -0.38;
                body.angularVelocity -= 0.16;
            } else {
                body.velocityX = Math.min(0, body.velocityX);
            }
        }

        if (body.y < bounds.minimumY) {
            body.y = bounds.minimumY;

            if (allowBounce && body.velocityY < 0) {
                body.velocityY *= -0.34;
            } else {
                body.velocityY = Math.max(0, body.velocityY);
            }
        } else if (body.y > bounds.maximumY) {
            body.y = bounds.maximumY;

            if (allowBounce && body.velocityY > 0) {
                body.velocityY *= -0.34;
                body.angularVelocity -= body.velocityX * 0.00035;
            } else {
                body.velocityY = Math.min(0, body.velocityY);
            }
        }
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

    function wakePhysics() {
        settledSteps = 0;

        if (!canAnimate() || animationFrame) {
            return;
        }

        previousFrameTime = performance.now();
        accumulator = 0;
        animationFrame = window.requestAnimationFrame(animationLoop);
    }

    function snapToRest() {
        body.x = restPosition.x;
        body.y = restPosition.y;
        body.velocityX = 0;
        body.velocityY = 0;
        body.angle = 0;
        body.angularVelocity = 0;
        settledSteps = 0;
        render();
    }

    function stepPhysics(deltaTime) {
        const targetX = activeDrag ? activeDrag.targetX : restPosition.x;
        const targetY = activeDrag ? activeDrag.targetY : restPosition.y;
        const springStrength = activeDrag ? 78 : 8.5;
        const linearDamping = activeDrag ? 13 : 4.2;
        const accelerationX =
            (targetX - body.x) * springStrength -
            body.velocityX * linearDamping;
        const accelerationY =
            (targetY - body.y) * springStrength -
            body.velocityY * linearDamping;

        body.velocityX = clamp(
            body.velocityX + accelerationX * deltaTime,
            -maximumLinearVelocity,
            maximumLinearVelocity
        );
        body.velocityY = clamp(
            body.velocityY + accelerationY * deltaTime,
            -maximumLinearVelocity,
            maximumLinearVelocity
        );
        body.x += body.velocityX * deltaTime;
        body.y += body.velocityY * deltaTime;

        const velocityTilt = body.velocityX * 0.00028;
        const dragTilt = activeDrag
            ? (activeDrag.targetX - body.x) * 0.0012
            : 0;
        const targetAngle = clamp(
            velocityTilt + dragTilt,
            -maximumAngle,
            maximumAngle
        );
        const angularAcceleration =
            (targetAngle - body.angle) * 28 -
            body.angularVelocity * 6.4;

        body.angularVelocity += angularAcceleration * deltaTime;
        body.angle = clamp(
            body.angle + body.angularVelocity * deltaTime,
            -maximumAngle,
            maximumAngle
        );
        constrainBodyToStage(true);

        if (activeDrag) {
            settledSteps = 0;
            return;
        }

        const distanceFromRest = Math.hypot(
            body.x - restPosition.x,
            body.y - restPosition.y
        );
        const linearSpeed = Math.hypot(body.velocityX, body.velocityY);

        if (
            distanceFromRest < 0.25 &&
            linearSpeed < 0.35 &&
            Math.abs(body.angle) < 0.001 &&
            Math.abs(body.angularVelocity) < 0.004
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
            stepPhysics(fixedTimeStep);
            accumulator -= fixedTimeStep;
            substeps += 1;
        }

        if (substeps === maximumSubsteps) {
            accumulator = 0;
        }

        render();

        if (!activeDrag && settledSteps >= 36) {
            snapToRest();
            return;
        }

        animationFrame = window.requestAnimationFrame(animationLoop);
    }

    function recalculateLayout() {
        const stageBounds = stage.getBoundingClientRect();

        if (stageBounds.width < 50 || stageBounds.height < 100) {
            return;
        }

        stageWidth = stageBounds.width;
        stageHeight = stageBounds.height;
        objectWidth = dragObject.offsetWidth;
        objectHeight = dragObject.offsetHeight;
        reducedMotion = reducedMotionQuery.matches;
        stage.dataset.reducedMotion = String(reducedMotion);

        const bounds = getMovementBounds();
        const centeredX = (bounds.minimumX + bounds.maximumX) / 2;
        restPosition.x =
            window.innerWidth <= 650
                ? centeredX
                : Math.max(bounds.minimumX, bounds.maximumX - 8);
        restPosition.y = bounds.minimumY + 2;

        if (!initialized || reducedMotion) {
            initialized = true;
            snapToRest();
        } else {
            body.x = clamp(body.x, bounds.minimumX, bounds.maximumX);
            body.y = clamp(body.y, bounds.minimumY, bounds.maximumY);
            render();
            wakePhysics();
        }
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
        if (
            reducedMotion ||
            activeDrag ||
            (event.pointerType === "mouse" && event.button !== 0)
        ) {
            return;
        }

        event.preventDefault();
        const pointer = getPointerPosition(event);

        activeDrag = {
            pointerId: event.pointerId,
            offsetX: pointer.x - body.x,
            offsetY: pointer.y - body.y,
            targetX: body.x,
            targetY: body.y,
            lastX: pointer.x,
            lastY: pointer.y,
            lastTime: event.timeStamp,
            velocityX: 0,
            velocityY: 0,
        };
        dragObject.classList.add("is-dragging");

        try {
            dragObject.setPointerCapture(event.pointerId);
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
        const elapsedMilliseconds = Math.max(
            latestEvent.timeStamp - activeDrag.lastTime,
            1
        );
        const instantaneousVelocityX =
            ((pointer.x - activeDrag.lastX) / elapsedMilliseconds) * 1000;
        const instantaneousVelocityY =
            ((pointer.y - activeDrag.lastY) / elapsedMilliseconds) * 1000;
        const bounds = getMovementBounds();

        activeDrag.velocityX =
            activeDrag.velocityX * 0.58 + instantaneousVelocityX * 0.42;
        activeDrag.velocityY =
            activeDrag.velocityY * 0.58 + instantaneousVelocityY * 0.42;
        activeDrag.targetX = clamp(
            pointer.x - activeDrag.offsetX,
            bounds.minimumX,
            bounds.maximumX
        );
        activeDrag.targetY = clamp(
            pointer.y - activeDrag.offsetY,
            bounds.minimumY,
            bounds.maximumY
        );
        activeDrag.lastX = pointer.x;
        activeDrag.lastY = pointer.y;
        activeDrag.lastTime = latestEvent.timeStamp;
        wakePhysics();
    }

    function endDrag(event, preserveMomentum) {
        if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
            return;
        }

        const pointerId = activeDrag.pointerId;

        if (preserveMomentum) {
            body.velocityX = clamp(
                body.velocityX * 0.65 + activeDrag.velocityX * 0.35,
                -maximumLinearVelocity,
                maximumLinearVelocity
            );
            body.velocityY = clamp(
                body.velocityY * 0.65 + activeDrag.velocityY * 0.35,
                -maximumLinearVelocity,
                maximumLinearVelocity
            );
            body.angularVelocity += body.velocityX * 0.00045;
        }

        activeDrag = null;
        dragObject.classList.remove("is-dragging");

        try {
            if (dragObject.hasPointerCapture(pointerId)) {
                dragObject.releasePointerCapture(pointerId);
            }
        } catch (error) {
            // The browser may already have released pointer capture.
        }

        wakePhysics();
    }

    dragObject.addEventListener("pointerdown", beginDrag, { passive: false });
    dragObject.addEventListener("pointermove", moveDrag, { passive: false });
    dragObject.addEventListener("pointerup", function (event) {
        endDrag(event, true);
    });
    dragObject.addEventListener("pointercancel", function (event) {
        endDrag(event, false);
    });
    dragObject.addEventListener("lostpointercapture", function (event) {
        if (activeDrag && event.pointerId === activeDrag.pointerId) {
            endDrag(event, true);
        }
    });
    dragObject.addEventListener("dragstart", function (event) {
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
        const stageResizeObserver = new ResizeObserver(scheduleLayoutUpdate);
        stageResizeObserver.observe(stage);
        stageResizeObserver.observe(dragObject);
    } else {
        window.addEventListener("resize", scheduleLayoutUpdate);
    }

    if (reducedMotionQuery.addEventListener) {
        reducedMotionQuery.addEventListener("change", scheduleLayoutUpdate);
    } else {
        reducedMotionQuery.addListener(scheduleLayoutUpdate);
    }

    window.addEventListener("orientationchange", scheduleLayoutUpdate);

    if (lanyardImage && !lanyardImage.complete) {
        lanyardImage.addEventListener("load", scheduleLayoutUpdate, {
            once: true,
        });
    }

    recalculateLayout();
}

initializePlvDragObject();
