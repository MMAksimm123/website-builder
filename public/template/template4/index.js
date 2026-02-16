// Плавная прокрутка
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if(target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Анимация при скролле
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.product, .post-card, .program-card, .review, .feature, .tip');

    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;

        if(elementPosition < screenPosition) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
};

// Устанавливаем начальные значения для анимации
document.querySelectorAll('.product, .post-card, .program-card, .review, .feature, .tip').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s, transform 0.6s';
});

window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);

// Обработка форм
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Форма отправлена! Спасибо за обращение.');
        this.reset();
    });
});

// Фильтрация товаров (для магазина)
if(document.querySelector('.filter-btn')) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const products = document.querySelectorAll('.product');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;

            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            products.forEach(product => {
                if(filter === 'all' || product.dataset.category === filter) {
                    product.style.display = 'block';
                } else {
                    product.style.display = 'none';
                }
            });
        });
    });
}

// Корзина (для магазина)
let cartCount = 0;
const cartElement = document.querySelector('.cart-count');
if(cartElement) {
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            cartCount++;
            cartElement.textContent = cartCount;

            button.textContent = '✓ В корзине';
            button.style.background = '#4CAF50';

            setTimeout(() => {
                button.textContent = 'В корзину';
                button.style.background = '#ff6b6b';
            }, 2000);
        });
    });
}

// Табы для тренировок (для фитнес приложения)
if(document.querySelector('.tab-btn')) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const workoutLists = document.querySelectorAll('.workout-list');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const day = button.dataset.day;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            workoutLists.forEach(list => {
                if(list.id === day) {
                    list.style.display = 'block';
                } else {
                    list.style.display = 'none';
                }
            });
        });
    });
}

// Счетчик калорий (простой пример)
const calculateCalories = () => {
    const meals = document.querySelectorAll('.meal-calories');
    let total = 0;
    meals.forEach(meal => {
        total += parseInt(meal.textContent);
    });
    return total;
};

if(document.querySelector('.meal-calories')) {
    const totalCalories = calculateCalories();
    const calorieInfo = document.createElement('div');
    calorieInfo.className = 'total-calories';
    calorieInfo.innerHTML = `<h3>Всего за день: ${totalCalories} ккал</h3>`;
    document.querySelector('.nutrition').appendChild(calorieInfo);
}
