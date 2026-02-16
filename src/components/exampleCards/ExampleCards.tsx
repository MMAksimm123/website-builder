import { useNavigate } from 'react-router-dom';
import '../../style/ExampleCards/ExampleCards.css';

interface ExampleCardsProps {
  templateId: number;
  name: string;
  templateData: { html: string; css: string; js: string };
}

const ExampleCards = ({ templateId, name, templateData }: ExampleCardsProps) => {
  const navigate = useNavigate();

  const handleTemplateSelect = () => {
    // Создаем уникальный ключ для каждого шаблона
    const templateKey = `template_${templateId}_${Date.now()}`;

    // Сохраняем данные шаблона в sessionStorage
    sessionStorage.setItem(templateKey, JSON.stringify({
      ...templateData,
      name: name,
      id: templateId
    }));

    // Передаем только ключ в state
    navigate('/dev', {
      state: {
        templateKey: templateKey,
        templateId: templateId
      }
    });
  };

  return (
    <div className='containerExample'>
      <div className='preview-container'>
        <div className='preview-overlay' onClick={handleTemplateSelect}></div>
        <iframe
          srcDoc={`
            <html>
              <head>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    transform: scale(0.3);
                    transform-origin: top left;
                    width: 333.33%;
                    height: 333.33%;
                    overflow: hidden;
                  }
                  ${templateData.css}
                </style>
              </head>
              <body>${templateData.html}</body>
            </html>
          `}
          title={`preview-${templateId}`}
          className='preview-iframe'
          sandbox="allow-scripts"
          scrolling="no"
        />
      </div>
      <div className='description'>
        <h3 className='template-name'>{name}</h3>
        <div className='containerBtn'>
          <button className='buttonHeader' onClick={handleTemplateSelect}>
            Использовать шаблон
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExampleCards;
