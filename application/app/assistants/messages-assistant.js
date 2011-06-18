function MessagesAssistant () { }

MessagesAssistant.prototype = {
  models: {
    spinner: { spinning: false },
    spinnerSmall: { spinning: false },
    list: {
      items: []
    }
  },

  swipeMenu: {
    element: false,
    menu: false,
    menuHeight: 0
  },

  statusForm: { display: false },

  cleanup: function (event) {
    Mojo.Event.stopListening(this.controller.get('updateStatus'), Mojo.Event.tap, this.updateStatusFormHandler);
    Mojo.Event.stopListening(this.controller.get('updateId'), Mojo.Event.tap, this.updateStatusEventHandler);
    Mojo.Event.stopListening(this.controller.get('yammer_msgs'), Mojo.Event.dragStart, this.dragStartHandler);
  },

  setup: function () {
    this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, Yammer.appMenu);

    this.controller.setupWidget('mojoSpinnerSmall', { spinnerSize: 'small' }, this.models.spinnerSmall);
    this.controller.setupWidget('mojoSpinner', { spinnerSize: 'large' }, this.models.spinner);
    this.controller.get('spinnerScrim').hide();

    this.controller.setupWidget("statusId", {
      multiline: true,
      enterSubmits: false,
      focus: true
    }, {
      value: "",
      disabled: false
    });

    // load cache
    this.models.list.items = Yammer.$cache.posts;

    // setup the list widget
    this.controller.setupWidget("yammer_msgs", {
      itemTemplate: 'messages/message'
    }, this.models.list);

    // set the top
    this.controller.get('updateStatusForm').style.top = (window.innerHeight - 40) + 'px';
    
    this.updateStatusFormHandler = this.updateStatusFormSwitch.bind(this);
    Mojo.Event.listen(this.controller.get('updateStatus'), Mojo.Event.tap, this.updateStatusFormHandler);

    this.updateStatusEventHandler = this.updateStatusEvent.bind(this);
    Mojo.Event.listen(this.controller.get('updateId'), Mojo.Event.tap, this.updateStatusEventHandler);

    this.listTapHandler = this.listTap.bind(this);
    Mojo.Event.listen(this.controller.get('yammer_msgs'), Mojo.Event.listTap, this.listTapHandler);
    
    this.dragStartHandler = this.dragStart.bind(this);
    Mojo.Event.listen(this.controller.get('yammer_msgs'), Mojo.Event.dragStart, this.dragStartHandler);
  },

  activate: function (event) {
    //this.fetchMessages();

    // check if cache is empty, clear out the list widget
    if (Yammer.$cache.posts.length === 0 && this.models.list.items.length > 0) {
      // TODO test
      this.controller.get('yammer_msgs').noticeRemovedItems(0, this.models.list.items.length);
      this.models.list.items = [];
      this.controller.modelChanged(this.models.list);
    }
  },

  fetchMessages: function () {
    this.models.spinnerSmall.spinning = true;
    this.controller.modelChanged(this.models.spinnerSmall);

    // Ajax request
    Yammer.getMessages(this.updateMessages.bind(this));
  },

  updateMessages: function (posts) {
    if (posts.length > 0) {
      var posts = Yammer.$cache.posts;
      this.controller.get('yammer_msgs').mojo.noticeUpdatedItems(0, posts);
    }

    this.models.spinnerSmall.spinning = false;
    this.controller.modelChanged(this.models.spinnerSmall);
  },

  updateStatusFormSwitch: function () {
    if (!this.statusForm.display) {
      Turbo.Effects(this.controller.get('updateStatusForm'), "top: 0px");
    } else {
      Turbo.Effects(this.controller.get('updateStatusForm'), "top: " + (window.innerHeight - 40) + "px");
    }

    this.statusForm.display = !this.statusForm.display;
  },

  updateStatusEvent: function () {
    this.controller.get('spinnerScrim').show();
    this.models.spinner.spinning = true;
    this.controller.modelChanged(this.models.spinner);

    // TODO error handling if user doesn't post anything
    Yammer.postMessage(this.controller.get('statusId').mojo.getValue(), null, (function (response) {
      Yammer.parseMessages(this.updateMessages.bind(this), false, response); // false cache?

      // TODO set value of what are you working on to NULL
      this.updateStatusFormSwitch();

      this.controller.get('spinnerScrim').hide();
      this.models.spinner.spinning = false;
      this.controller.modelChanged(this.models.spinner);
    }).bind(this));
  },

  listTap: function (event) {

    // for now push the thread scene
    Mojo.Controller.stageController.pushScene({ name: "thread" }, event.item);
    
    // by default it's supposed to show the quick menu
  },

  _getNodeFrom: function (event) {
    return event.target.up(".palm-row")                                                                                                 
  },

  dragStart: function (event) {

    if (this.swipeMenu.menu) {
      Turbo.Effects(this.swipeMenu.menu, 
        "height: " + this.swipeMenu.menuHeight + "px; line-height: " + (this.swipeMenuHeight + 50) + "px",
        null,
        (function () {
          this.swipeMenu.menu.remove();
          this.swipeMenu.menu = false;

          this.swipeMenu.element.style.opacity = "0.0";
          this.swipeMenu.element.show();
          Turbo.Effects(this.swipeMenu.element, "opacity: 1.0");

          this.swipeMenu.element = false;
        }).bind(this)
      );
    }

    if (Math.abs(event.filteredDistance.x) > Math.abs(event.filteredDistance.y) * 2) {
      var node = event.target.up(".palm-row");
      Mojo.Drag.setupDropContainer(node, this);

      node._dragObj = Mojo.Drag.startDragging(this.controller, node, event.down, {
        preventVertical: true,
        draggingClass: "palm-delete-element",
        preventDropReset: false
      });

      event.stop();
    }
  },

  dragEnter: function (element) {
    this.swipeMenu.menu = document.createElement('div');
    this.swipeMenu.menu.className = 'palm-row palm-swipe-delete swipe-menu';
    this.swipeMenu.menuHeight = element.offsetHeight;
    this.swipeMenu.menu.style.height = this.swipeMenu.menuHeight + 'px';
    this.swipeMenu.menu.style.lineHeight = (this.swipeMenu.menuHeight - 50) + 'px';

    element.insert({ before: this.swipeMenu.menu });

    this.swipeMenu.menu.update(Mojo.View.render({ object: element.id, template: 'messages/swipemenu' }));
  },

  dragHover: function (element) {
    if (element.offsetLeft > 200 || element.offsetLeft < -200) {
      element._showMenu = true;
    } else {
      element._showMenu = false;
    }
  },

  dragDrop: function (element) {
    if (element._showMenu === true) {
      this.swipeMenu.element = element;
      this.swipeMenu.element.hide();
      Turbo.Effects(this.swipeMenu.menu, "height: 100px; line-height: 50px");

      //Mojo.Event.stopListening(this.controller.get('yammer_msgs'), Mojo.Event.dragStart, this.dragStartHandler);
      // TODO add functionality to swipe menu
      Mojo.Log.error('ID');
      Mojo.Log.error(this.swipeMenu.element.id);

      //Mojo.Log.error(this.swipeMenu.item.message.id); // ?
    } else {
      this.swipeMenu.element = false;
      this.swipeMenu.menu.remove();
      this.swipeMenu.menu = false;
    }

    delete element._showMenu;
  },                    

  handleCommand: function (event) {
    switch (event.type) {
    case Mojo.Event.back:
      this.updateStatusFormSwitch();
      event.stop();
      event.stopPropagation();
      break;
    case Mojo.Event.forward:
      this.fetchMessages();
      event.stop();
      event.stopPropagation();
      break; 
    }
  }

};
