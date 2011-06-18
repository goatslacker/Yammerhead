function ThreadAssistant (post) {
  this.message_id = post.message.id;
  this.post = post;
}

ThreadAssistant.prototype = {
  models: {
    spinner: { spinning: false },
    spinnerSmall: { spinning: false },
    list: {
      items: []
    }
  },

  replyForm: {
    display: false
  },

  liked: false,

  setup: function () {
    this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, Yammer.appMenu);

    this.controller.setupWidget('mojoSpinnerSmall', { spinnerSize: 'small' }, this.models.spinnerSmall);
    this.controller.setupWidget('mojoSpinner', { spinnerSize: 'large' }, this.models.spinner);
    this.controller.get('spinnerScrim').hide();

    // check cache first...
    var i = 0; thread = [];
    for (i = 0; i < Yammer.$cache.threads.length; i = i + 1) {
      if (Yammer.$cache.threads[i].thread_id === this.message_id) {
        thread = Yammer.$cache.threads[i];
      }
    }
    this.models.list.items = thread;

    // setup list
    this.controller.setupWidget("yammer_msgs", {
      itemTemplate: 'messages/message',
    }, this.models.list);

    // text field
    this.controller.setupWidget("statusId", {
      multiline: true,
      enterSubmits: false,
      focus: true
    }, {
      value: "",
      disabled: false
    });

    // set the opacity and hide
    this.controller.get('replyForm').style.opacity = 0;
    this.controller.get('replyForm').hide();

    // if already liked...
    if (this.post.message.liked === true) {
      this.liked = true;
      this.controller.get('likedBy').innerHTML = "Unlike";
    }
    
    // reply button form-switch event
    this.replyFormHandler = this.replyFormSwitch.bind(this);
    Mojo.Event.listen(this.controller.get('replyTo'), Mojo.Event.tap, this.replyFormHandler);

    // reply button post event
    this.replyEventHandler = this.replyEvent.bind(this);
    Mojo.Event.listen(this.controller.get('updateId'), Mojo.Event.tap, this.replyEventHandler);

    this.likedByHandler = this.likeSwitch.bind(this);
    Mojo.Event.listen(this.controller.get('likedBy'), Mojo.Event.tap, this.likedByHandler);

    // fetch from cloud
    if (thread.length === 0) {
      this.fetchThread(true);
    } else {
      this.fetchThread(false);
    }
  },

  fetchThread: function (scrim) {
    scrim = scrim || false;

    if (scrim === true) {
      this.controller.get('spinnerScrim').show();
      this.models.spinner.spinning = true;
      this.controller.modelChanged(this.models.spinner);
    } else {
      this.models.spinnerSmall.spinning = true;
      this.controller.modelChanged(this.models.spinnerSmall);
    }

    Yammer.getThread(this.message_id, this.updateThread.bind(this));
  },

  updateThread: function (messages) {
    // reverse array so it's in correct order
    messages.reverse();

    if (messages.length > 0) {
      if (messages[0].message.liked === true) {
        this.liked = true;
        this.controller.get('likedBy').innerHTML = "Unlike";
      }
    }

    this.controller.get('yammer_msgs').mojo.noticeUpdatedItems(0, messages);

    if (this.models.spinner.spinning === true) {
      this.controller.get('spinnerScrim').hide();
      this.models.spinner.spinning = false;
      this.controller.modelChanged(this.models.spinner);
    }

    if (this.models.spinnerSmall.spinning === true) {
      this.models.spinnerSmall.spinning = false;
      this.controller.modelChanged(this.models.spinnerSmall);
    }

    // cache threads
    Yammer.cacheThread(this.message_id, messages);
  },

  likeSwitch: function () {

    // TODO callbacks to check for errors
    if (!this.liked) {
      Yammer.likeMessage(this.message_id);
      this.controller.get('likedBy').innerHTML = "Unlike";
    } else {
      Yammer.unlikeMessage(this.message_id);
      this.controller.get('likedBy').innerHTML = "Like";
    }

    this.liked = !this.liked;
  },

  replyFormSwitch: function () {
    if (!this.replyForm.display) {
      this.controller.get('replyForm').show();
      // TODO focus element
      Turbo.Effects(this.controller.get('replyForm'), "opacity: 1.0");
    } else {
      Turbo.Effects(this.controller.get('replyForm'), "opacity: 0.0", null, (function () {
        this.controller.get('replyForm').hide();
      }).bind(this));
    }

    this.replyForm.display = !this.replyForm.display;
  },

  replyEvent: function () {
    this.controller.get('spinnerScrim').show();
    this.models.spinner.spinning = true;
    this.controller.modelChanged(this.models.spinner);

    // TODO error handling if user doesn't post anything
    Yammer.postMessage(this.controller.get('statusId').mojo.getValue(), this.message_id, (function (response) {
      // TODO set value of reply to NULL
      this.replyFormSwitch();
    }).bind(this));
  },

  handleCommand: function (event) {
    switch (event.type) {
    case Mojo.Event.back:
      if (this.replyForm.display) {
        this.replyFormSwitch();
        event.stop();
        event.stopPropagation();
      }
      break;
    case Mojo.Event.forward:
      // TODO user option to like or reply
      this.replyFormSwitch();
      event.stop();
      event.stopPropagation();
      break; 
    }
  }

};
