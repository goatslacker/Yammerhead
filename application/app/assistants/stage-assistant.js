function StageAssistant () {
	/* this is the creator function for your stage assistant object */
}

StageAssistant.prototype.setup = function () {
  Mojo.Controller.stageController.pushScene('splash');
};

StageAssistant.prototype.handleCommand = function (event) {
  if (event.type === Mojo.Event.command) {
    var scenes = Mojo.Controller.stageController.getScenes(), topScene = scenes[scenes.length - 1];

    switch (event.command) {
    case 'about':
    case 'prefs':
      if (topScene.sceneName !== event.command) {
        Mojo.Controller.stageController.pushScene({ name: event.command });
      }
      break;
    }

  }
};
