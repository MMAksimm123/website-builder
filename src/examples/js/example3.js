// Фильтрация работ
document.querySelectorAll('.filter-buttons button').forEach(button => {
    button.addEventListener('click', () => {
        // Убираем активный класс у всех кнопок
        document.querySelectorAll('.filter-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        // Добавляем активный класс текущей кнопке
        button.classList.add('active');

        const filter = button.getAttribute('data-filter');
        document.querySelectorAll('.artwork').forEach(artwork => {
            if (filter === 'all' || artwork.getAttribute('data-category') === filter) {
                artwork.style.display = 'block';
            } else {
                artwork.style.display = 'none';
            }
        });
    });
});

// Анимация при наведении на работу
document.querySelectorAll('.artwork').forEach(artwork => {
    artwork.addEventListener('mouseenter', () => {
        artwork.querySelector('img').style.transform = 'scale(1.1)';
    });
    artwork.addEventListener('mouseleave', () => {
        artwork.querySelector('img').style.transform = 'scale(1)';
    });
});
