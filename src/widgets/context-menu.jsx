// Context Menu: popup/dropdown menu.
import React from 'react';
import ReactDOM from 'react-dom';
import { injectIntl, defineMessages } from 'react-intl';

import { REM_SIZE } from '../config.js';

const messages = defineMessages({
  info: {
    id: 'menu_item_info',
    defaultMessage: 'Info',
    description: 'Show extended topic information'
  },
  clear_messages: {
    id: 'menu_item_clear_messages',
    defaultMessage: 'Clear messages',
    description: 'Delete all messages'
  },
  clear_for_all: {
    id: 'menu_item_clear_messages_for_all',
    defaultMessage: 'Clear for All',
    description: 'Delete all message(s) for all members'
  },
  'delete': {
    id: 'menu_item_delete',
    defaultMessage: 'Delete',
    description: 'Delete selected messages'
  },
  delete_for_all: {
    id: 'menu_item_delete_for_all',
    defaultMessage: 'Delete for All',
    description: 'Delete selected message(s) for all members'
  },
  mute: {
    id: 'menu_item_mute',
    defaultMessage: 'Mute',
    description: 'Turn off notifications'
  },
  unmute: {
    id: 'menu_item_unmute',
    defaultMessage: 'Unmute',
    description: 'Turn notifications on'
  },
  topic_delete: {
    id: 'menu_item_delete_topic',
    defaultMessage: 'Delete',
    description: 'Delete entire topic'
  },
  unblock: {
    id: 'menu_item_unblock',
    defaultMessage: 'Unblock',
    description: 'Unblock user'
  },
  block: {
    id: 'menu_item_block',
    defaultMessage: 'Block',
    description: 'Block user'
  },
  member_delete: {
    id: 'menu_item_member_delete',
    defaultMessage: 'Remove',
    description: 'Remove user from topic'
  }
});

class ContextMenu extends React.Component {
  constructor(props) {
    super(props);

    const {formatMessage} = props.intl;

    this.handlePageClick = this.handlePageClick.bind(this);
    this.handleEscapeKey = this.handleEscapeKey.bind(this);
    this.handleClick = this.handleClick.bind(this);

    // Preconfigured menu items.
    this.MenuItems = {
      'topic_info':     {title: formatMessage(messages.info), handler: null},

      'messages_clear': {title: formatMessage(messages.clear_messages), handler: (params, errorHandler) => {
        this.deleteMessages(true, false, params, errorHandler);
      }},
      'messages_clear_hard': {title: formatMessage(messages.clear_for_all), handler: (params, errorHandler) => {
        this.deleteMessages(true, true, params, errorHandler);
      }},
      'message_delete': {title: formatMessage(messages.delete), handler: (params, errorHandler) => {
        this.deleteMessages(false, false, params, errorHandler);
      }},
      'message_delete_hard': {title: formatMessage(messages.delete_for_all), handler: (params, errorHandler) => {
        this.deleteMessages(false, true, params, errorHandler);
      }},
      'topic_unmute':   {title: formatMessage(messages.unmute), handler: this.topicPermissionSetter.bind(this, '+P')},
      'topic_mute':     {title: formatMessage(messages.mute), handler: this.topicPermissionSetter.bind(this, '-P')},
      'topic_unblock':  {title: formatMessage(messages.unblock), handler: this.topicPermissionSetter.bind(this, '+J')},
      'topic_block':    {title: formatMessage(messages.block), handler: this.topicPermissionSetter.bind(this, '-J')},
      'topic_delete':   {title: formatMessage(messages.topic_delete), handler: (params, errorHandler) => {
        let topic = this.props.tinode.getTopic(params.topicName);
        if (!topic) {
          console.log("Topic not found: ", params.topicName);
          return;
        }
        topic.delTopic().catch((err) => {
          if (errorHandler) {
            errorHandler(err.message, 'err');
          }
        });
      }},
      // menu_item_edit_permissions is defined elsewhere.
      'permissions':    {title: formatMessage({id: 'menu_item_edit_permissions'}), handler: null},
      'member_delete':  {title: formatMessage(messages.member_delete), handler: (params, errorHandler) => {
        let topic = this.props.tinode.getTopic(params.topicName);
        if (!topic || !params.user) {
          console.log("Topic or user not found: '" + params.topicName + "', '" + params.user + "'");
          return;
        }
        topic.delSubscription(params.user).catch((err) => {
          if (errorHandler) {
            errorHandler(err.message, 'err');
          }
        });
      }},
      'member_mute':    {title: formatMessage(messages.mute), handler: this.topicPermissionSetter.bind(this, '-P')},
      'member_unmute':  {title: formatMessage(messages.unmute), handler: this.topicPermissionSetter.bind(this, '+P')},
      'member_block':   {title: formatMessage(messages.block), handler: this.topicPermissionSetter.bind(this, '-J')},
      'member_unblock': {title: formatMessage(messages.unblock), handler: this.topicPermissionSetter.bind(this, '+J')},
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handlePageClick, false);
    document.addEventListener('keyup', this.handleEscapeKey, false);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handlePageClick, false);
    document.removeEventListener('keyup', this.handleEscapeKey, false);
  }

  handlePageClick(e) {
    if (ReactDOM.findDOMNode(this).contains(e.target)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.props.hide();
  }

  handleEscapeKey(e) {
    if (e.keyCode === 27) {
      this.props.hide();
    }
  }

  handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.hide();
    let item = this.props.items[e.currentTarget.dataset.id];
    if (typeof item == 'string') {
      item = this.MenuItems[item];
    }
    item.handler(this.props.params, this.props.onError);
  }

  // Menu Actions

  deleteMessages(all, hard, params, errorHandler) {
    const topic = this.props.tinode.getTopic(params.topicName);
    if (!topic) {
      console.log("Topic not found: ", params.topicName);
      return;
    }
    // We don't know if the message is still pending (e.g. attachment is being uploaded),
    // so try cancelling first. No harm if we can't cancel.
    if (topic.cancelSend(params.seq)) {
      return Promise.resolve();
    }
    // Can't cancel. Delete instead.
    var promise = all ?
      topic.delMessagesAll(hard) :
      topic.delMessagesList([params.seq], hard);
    promise.catch((err) => {
      if (errorHandler) {
        errorHandler(err.message, 'err');
      }
    });
  }

  // Function is used by context menu to set permissions.
  topicPermissionSetter(mode, params, errorHandler) {
    const topic = this.props.tinode.getTopic(params.topicName);
    if (!topic) {
      console.log("Topic not found", params.topicName);
      return;
    }

    let am, user;
    if (params.user) {
      user = topic.subscriber(params.user);
      if (!user) {
        console.log("Subscriber not found", params.topicName + "[" + params.user + "]");
        return;
      }
      am = user.acs.updateGiven(mode).getGiven();
    } else {
      am = topic.getAccessMode().updateWant(mode).getWant();
    }

    topic.setMeta({sub: {user: params.user, mode: am}}).catch((err) => {
      if (errorHandler) {
        errorHandler(err.message, 'err');
      }
    });
  }

  render() {
    let count = 0;
    let menu = [];
    this.props.items.map((item) => {
      if (typeof item == 'string') {
        item = this.MenuItems[item];
      }
      if (item && item.title) {
        menu.push(
          item.title == '-' ?
            <li className="separator" key={count} />
            :
            <li onClick={this.handleClick} data-id={count} key={count}>{item.title}</li>
        );
      }
      count++;
    });

    // Ensure that menu is inside the app-container.
    const hSize = 12 * REM_SIZE;
    const vSize = REM_SIZE * (0.7 + menu.length * 2.5);
    const left = (this.props.bounds.right - this.props.clickAt.x < hSize) ?
        (this.props.clickAt.x - this.props.bounds.left - hSize) :
        (this.props.clickAt.x - this.props.bounds.left);
    const top = (this.props.bounds.bottom - this.props.clickAt.y < vSize) ?
        (this.props.clickAt.y - this.props.bounds.top - vSize) :
        (this.props.clickAt.y - this.props.bounds.top);

    const position = {
      left: left + 'px',
      top: top + 'px'
    };

    return (
      <ul className="menu" style={position}>
        {menu}
      </ul>
    );
  }
}

export default injectIntl(ContextMenu);
