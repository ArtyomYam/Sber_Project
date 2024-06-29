import React, {createRef} from "react";
import { createAssistant, createSmartappDebugger } from '@salutejs/client';
import "./App.css";


document.addEventListener('keydown', (event) => {
  const heightInput = document.getElementById('height-input');
  const weightInput = document.getElementById('weight-input');
  const calcButton = document.getElementById('calc-button');
  const resetButton = document.getElementById('reset-button');

  heightInput.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault();
    }
  });

  weightInput.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault();
    }
  });
  switch (event.code) {
    case 'ArrowDown':
      if (document.activeElement === weightInput) {
        heightInput.focus({ preventScroll: true });
      }else if (document.activeElement === heightInput){
        calcButton.focus({ preventScroll: true });
      }else if (document.activeElement === calcButton){
        resetButton.focus({ preventScroll: true });
      }else{
        weightInput.focus({ preventScroll: true });
      }
      break;
    case 'ArrowUp':
      if (document.activeElement === heightInput) {
        weightInput.focus({ preventScroll: true });
      }else if (document.activeElement === calcButton){
        heightInput.focus({ preventScroll: true });
      }else if (document.activeElement === resetButton){
        calcButton.focus({ preventScroll: true });
      }else{
        resetButton.focus({ preventScroll: true });
      }
      break;
    case 'Enter':
      if (document.activeElement === calcButton) {
        calcButton.click({ preventScroll: true });
      }
      break;
  }
});

const initializeAssistant = (getState /*: any*/, getRecoveryState) => {
  if (process.env.NODE_ENV === 'development') {
    return createSmartappDebugger({
      token: process.env.REACT_APP_TOKEN ?? '',
      initPhrase: `Запусти ${process.env.REACT_APP_SMARTAPP}`,
      getState,
      nativePanel: {
        defaultText: '',
        screenshotMode: false,
        tabIndex: -1,
      },
    });
  } else {
    return createAssistant({ getState });
  }
};

export class App extends React.Component {
  constructor(props) {
    super(props);
    this.SelectedElement = createRef();
    console.log('constructor');


    this.state = {weight: 0,
        height: 0,
        bmi: 0,
        msg: 'Заключение:',
        indicatorColor: 'gray',
        x:0, y:0
      }
  
    this.assistant = initializeAssistant(() => this.getStateForAssistant());
  
    this.assistant.on('data', (event /*: any*/) => {
      console.log(`assistant.on(data)`, event);
      if (event.type === 'character') {
        console.log(`assistant.on(data): character: "${event?.character?.id}"`);
      } else if (event.type === 'insets') {
        console.log(`assistant.on(data): insets`);
      } else {
        const { action } = event;
        this.dispatchAssistantAction(action);
      }
    });
  
    this.assistant.on('start', (event) => {
      let initialData = this.assistant.getInitialData();
  
      console.log(`assistant.on(start)`, event, initialData);
    });
  
    this.assistant.on('command', (event) => {
      console.log(`assistant.on(command)`, event);
    });
 
    this.assistant.on('error', (event) => {
      console.log(`assistant.on(error)`, event);
    });

    this.assistant.on('tts', (event) => {
      console.log(`assistant.on(tts)`, event);
    });
  }
    getStateForAssistant() {
        console.log('getStateForAssistant: this.state:', this.state);
        const state = {
            weight: this.state.weight,
            height: this.state.height,
            bmi: this.state.bmi,
            msg: this.state.msg,
            ignored_words: [
                'добавить', 'установить', 'запиши', 'поставь', 'закинь', //setHeight.sc, setWeight.sc
                'сбрось', 'скинь', 'удали', 'очисть', 'перезагрузи',// resetState.sc
                'посчитай', 'расчитать', 'вычисли', 'расчитай' // calculateBMI.sc
            ],
        };
        console.log('getStateForAssistant: state:', state);
        return state;
    }
  
    dispatchAssistantAction(action) {
      console.log('dispatchAssistantAction', action);
      if (action) {
        switch (action.type) {  
          case 'SET_WEIGHT':
            return this.set_weight(action);
  
          case 'SET_HEIGHT':
            return this.set_height(action);

          case 'RESET':
            return this.resetState(action);
        
          case 'CALCULATE_BMI':
            return this.calculateBmi(action);
  
          default:
            throw new Error();
        }
      }
    }

    set_weight(action) {
        console.log('set_weight', action);
        this.setState({
            weight: action.payload
        });
    }

    set_height(action) {
        console.log('set_height', action);
        this.setState({
            height: action.payload
        });
    }


    _send_action_value(action_id, value) {
        const data = {
            action: {
                action_id: action_id,
                parameters: {
                    value: value, // отправляемый текст
                },
            },
        };
        console.log('send_action_value: sending text:', value);
        const unsubscribe = this.assistant.sendData(data, (response) => {
            // функция, вызываемая, если на sendData() был отправлен ответ
            const { type, payload } = response;
            console.log('sendData onData:', type, payload);
            unsubscribe();
        });
    }

    calculateBmi = () => {
      const { weight, height } = this.state;
      let bmi;
      let msg;
      let indicatorColor;
  
      if (!weight || !height || weight <= 0 || height <= 0) {
        const errorMessage = 'Пожалуйста, введите подходящее значение.';
        console.log('bmi calculation error');
        this.setState({ msg: errorMessage, bmi: '0', indicatorColor: 'gray' });
        bmi = 0;
        this._send_action_value('calculate_bmi', bmi + '. ' + errorMessage);
      } else {
        bmi = (weight / (height * height)) * 10000;
  
        if (bmi <= 16) {
          msg = 'Выраженный дефицит веса';
          indicatorColor = 'red';
        } else if (bmi > 16 && bmi <= 17.99) {
          msg = 'Недостаток массы тела';
          indicatorColor = 'orange';
        } else if (bmi >= 18 && bmi <= 24.99) {
          msg = 'Норма';
          indicatorColor = 'green';
        } else if (bmi >= 25 && bmi <= 29.99) {
          msg = 'Чрезмерная масса тела (предожирение)';
          indicatorColor = 'yellow';
        } else if (bmi >= 30 && bmi <= 34.99) {
          msg = 'Ожирение I степени';
          indicatorColor = 'orange';
        } else if (bmi >= 35 && bmi <= 39.99) {
          msg = 'Ожирение II степени';
          indicatorColor = 'red';
        } else if (bmi >= 40) {
          msg = 'Ожирение III степени';
          indicatorColor = 'darkred';
        }
  
        this.setState({ bmi: bmi.toFixed(2).toString(), msg, indicatorColor });
        this._send_action_value('calculate_bmi', bmi.toFixed(2) + '. ' + msg);
      }
    };

    resetState = () => {
      this.setState({
        weight: 0,
        height: 0,
        bmi: 0,
        msg: 'Заключение:',
        indicatorColor: 'gray',
      });
    };


    validateInput = (value) => {
      const regex = /^[0-9]*$/;
      return regex.test(value);
    };

    handleWeightChange = (e) => {
      const value = e.target.value;
      if (this.validateInput(value)) {
        this.setState({ weight: value ? parseFloat(value) : '' });
      }
    };
    
    handleHeightChange = (e) => {
      const value = e.target.value;
      if (this.validateInput(value)) {
        this.setState({ height: value ? parseFloat(value) : '' });
      }
    };

  render() {
    const { weight, height, bmi, msg, indicatorColor } = this.state;

    return (
      <div className="app">
        <div className="container">
          <h1 className="title">BMI Calculator</h1>
          <form onSubmit={(e) => {e.preventDefault(); this.calculateBmi();}}>
            <div className="indicator" style={{ backgroundColor: indicatorColor }}></div>
            <div>
              <label className="labels">Вес:</label><br/>
              <input
                id="weight-input"
                className="bmi-input"
                type="number"
                min="1"
                placeholder="Введите вес...(в кг)"
                value={weight || ''}
                onChange={this.handleWeightChange} 
              />
            </div>
            <div>
              <label className="labels">Рост:</label><br/>
              <input
                id="height-input"
                className="bmi-input"
                type="number"
                min="1"
                placeholder="Введите рост...(в см)"
                value={height || ''}
                onChange={this.handleHeightChange}
              />
            </div>
            <div>
              <button id="calc-button" className="btn" type="submit">Рассчитать</button>
              <button id="reset-button" className="btn btn-reload" type="button" onClick={() => this.resetState()}>Сбросить</button>
            </div>
            <div className="result">
              <h3>Значение ИМТ: {bmi}</h3>
              <p className="p-msg">{msg}</p>
            </div>
          </form>
        </div>
      </div>
    );
  }
}



