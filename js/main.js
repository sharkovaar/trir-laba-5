$(document).ready(function() {
    
    /* Скорость анимации возврата фигуры наверх (в миллисекундах) */
    const ANIMATION_SPEED_MS = 400;

    /* Количество миллисекунд в одной секунде для конвертации таймингов */
    const MS_PER_SECOND = 1000;

    /* Базовое числовое основание для перевода строк в числа */
    const NUMBER_BASE_RADIX = 10;

    /* Дефолтное значение интервала генерации (в миллисекундах) */
    const DEFAULT_INTERVAL_MS = 2000;

    /* Минимально допустимый интервал времени для генерации (в миллисекундах) */
    const MIN_INTERVAL_MS = 0;

    /* Ширина динамически генерируемой фигуры (в пикселях) */
    const SHAPE_WIDTH_PX = 45;

    /* Высота «безопасной зоны» над корзинами, чтобы фигуры не появлялись внутри них (в пикселях) */
    const BOTTOM_ZONE_OFFSET_PX = 170;

    /* Массив доступных классов геометрических форм для фигур */
    const SHAPE_TYPES = ['shape-square', 'shape-circle'];

    /* Массив доступных строковых идентификаторов цвета для фигур */
    const COLORS = ['black', 'red'];

    /* Структура для хранения динамического состояния приложения */
    let appState = {
        counters: {
            black: 0,
            red: 0
        },
        spawnTimerId: null,
        isGenerating: false
    };

    /* Ссылка на объект jQuery для изолированного игрового контейнера */
    const $gameZone = $('#game-zone');

    /* Ссылка на объект jQuery для кнопки инициализации генерации */
    const $btnStart = $('#btn-start');

    /* Ссылка на объект jQuery для кнопки приостановки генерации */
    const $btnStop = $('#btn-stop');

    /* Ссылка на объект jQuery для кнопки полного сброса состояния */
    const $btnClear = $('#btn-clear');

    /*
     Синхронизирует текущие числовые значения из JSON-структуры состояния с текстовым табло на экране
     */
    function updateScoreboard() {
        $('#counter-black').text(appState.counters.black);
        $('#counter-red').text(appState.counters.red);
    }

    /*
     Генерирует HTML-элемент случайной фигуры, рассчитывает координаты её появления 
     и инициализирует кастомный алгоритм перетаскивания (Drag & Drop) на основе событий мыши.
     */
    function generateShape() {
        const randomType = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        const maxTop = $gameZone.height() - BOTTOM_ZONE_OFFSET_PX; 
        const maxLeft = $gameZone.width() - SHAPE_WIDTH_PX;
        
        const randomTop = Math.floor(Math.random() * maxTop);
        const randomLeft = Math.floor(Math.random() * maxLeft);

        const $shape = $('<div></div>')
            .addClass(`spawned-shape ${randomType}`)
            .css({
                top: randomTop + 'px',
                left: randomLeft + 'px',
                backgroundColor: randomColor === 'black' ? '#102a43' : '#b71c1c'
            })
            .data('color', randomColor);

        $shape.on('mousedown', function(e) {
            e.preventDefault();
            const $currentShape = $(this);
            
            $currentShape.css('transition', 'none');

            const startX = e.clientX - $currentShape.position().left;
            const startY = e.clientY - $currentShape.position().top;

            $(document).on('mousemove.drag', function(moveEvent) {
                let newLeft = moveEvent.clientX - startX;
                let newTop = moveEvent.clientY - startY;

                if (newLeft < 0) newLeft = 0;
                if (newTop < 0) newTop = 0;
                if (newLeft > $gameZone.width() - $currentShape.width()) {
                    newLeft = $gameZone.width() - $currentShape.width();
                }
                if (newTop > $gameZone.height() - $currentShape.height()) {
                    newTop = $gameZone.height() - $currentShape.height();
                }

                $currentShape.css({ left: newLeft + 'px', top: newTop + 'px' });
            });

            $(document).on('mouseup.drag', function() {
                $(document).off('.drag');

                const shapeX = $currentShape.position().left + ($currentShape.width() / 2);
                const shapeY = $currentShape.position().top + ($currentShape.height() / 2);
                const shapeColor = $currentShape.data('color');
                
                let isDroppedCorrectly = false;

                $('.bin').each(function() {
                    const $bin = $(this);
                    const binLeft = $bin.position().left;
                    const binTop = $bin.position().top;
                    const binWidth = $bin.width();
                    const binHeight = $bin.height();
                    const binColor = $bin.data('color');

                    if (shapeX >= binLeft && shapeX <= (binLeft + binWidth) &&
                        shapeY >= binTop && shapeY <= (binTop + binHeight)) {
                        
                        if (shapeColor === binColor) {
                            appState.counters[binColor]++;
                            updateScoreboard();
                            $currentShape.remove();
                            isDroppedCorrectly = true;
                        } else {
                            $bin.css({ 'background-color': 'rgba(231, 76, 60, 0.4)', 'border-style': 'solid' });
                            setTimeout(function() {
                                $bin.css({ 'background-color': '', 'border-style': '' });
                            }, ANIMATION_SPEED_MS);
                        }
                    }
                });

                if (!isDroppedCorrectly) {
                    $currentShape.css('transition', `all ${ANIMATION_SPEED_MS / MS_PER_SECOND}s ease-out`);
                    
                    const escapeTop = Math.floor(Math.random() * maxTop);
                    const escapeLeft = Math.floor(Math.random() * maxLeft);
                    
                    $currentShape.css({
                        top: escapeTop + 'px',
                        left: escapeLeft + 'px'
                    });
                }
            });
        });

        $gameZone.append($shape);
    }

    $btnStart.on('click', function() {
        const rawValue = $('#spawn-interval').val();
        const intervalValue = parseInt(rawValue, NUMBER_BASE_RADIX);

        if (isNaN(intervalValue) || intervalValue <= MIN_INTERVAL_MS) {
            alert("Ошибка: Интервал появления фигур должен быть положительным числом больше нуля!");
            return; 
        }

        appState.isGenerating = true;
        $btnStart.prop('disabled', true);
        $btnStop.prop('disabled', false);
        appState.spawnTimerId = setInterval(generateShape, intervalValue);
    });

    $btnStop.on('click', function() {
        clearInterval(appState.spawnTimerId);
        appState.isGenerating = false;
        $btnStart.prop('disabled', false);
        $btnStop.prop('disabled', true);
    });

    $btnClear.on('click', function() {
        clearInterval(appState.spawnTimerId);
        appState.isGenerating = false;
        appState.counters.black = 0;
        appState.counters.red = 0;
        updateScoreboard();
        $('.spawned-shape').remove();
        $btnStart.prop('disabled', false);
        $btnStop.prop('disabled', true);
    });
});
