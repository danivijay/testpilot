import fetchMock from 'fetch-mock';
import React from 'react';
import { expect } from 'chai';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import { findLocalizedById } from '../util';

import EmailDialog from '../../../src/app/components/EmailDialog';
import { basketUrl } from '../../../src/app/lib/utils';

describe('app/components/EmailDialog', () => {

  const mockLocation = 'https://example.com';

  const mockClickEvent = {
    preventDefault() {},
    stopPropagation() {}
  };

  const mockEscapeKeyDownEvent = {
    preventDefault() {},
    stopPropagation() {},
    key: 'Escape'
  };
  const mockEnterKeyDownEvent = {
    preventDefault() {},
    stopPropagation() {},
    key: 'Enter'
  };

  let onDismiss, sendToGA, getWindowLocation, subject;
  beforeEach(() => {
    fetchMock.restore();
    onDismiss = sinon.spy();
    sendToGA = sinon.spy();
    getWindowLocation = sinon.spy(() => mockLocation);
    subject = shallow(<EmailDialog {...{ onDismiss, sendToGA, getWindowLocation }} />);
  });

  it('should render a modal container', () => {
    expect(subject.find('.modal-container')).to.have.property('length', 1);
  });

  it('should dismiss when skip is clicked', () => {
    subject.find('.modal-cancel').simulate('click', mockClickEvent);

    expect(onDismiss.called).to.be.true;
    expect(sendToGA.lastCall.args).to.deep.equal(['event', {
      eventCategory: 'HomePage Interactions',
      eventAction: 'button click',
      eventLabel: 'Skip email'
    }]);
  });

  it('should dismiss when <Escape> key is pressed', () => {
    subject.find('.modal-container').simulate('keyDown', mockEscapeKeyDownEvent);

    expect(onDismiss.called).to.be.true;
    expect(sendToGA.lastCall.args).to.deep.equal(['event', {
      eventCategory: 'HomePage Interactions',
      eventAction: 'button click',
      eventLabel: 'Skip email'
    }]);
  });

  it('should include a NewsletterForm', () => {
    const form = subject.find('NewsletterForm');
    expect(form).to.have.length(1);
  });

  it('should subscribe to basket on valid email when submit clicked', done => {
    const expectedEmail = 'me@a.b.com';
    subject.setState({ email: expectedEmail });

    fetchMock.post(basketUrl, 200);
    subject.instance().handleSubscribe(expectedEmail);

    expect(sendToGA.lastCall.args).to.deep.equal(['event', {
      eventCategory: 'HomePage Interactions',
      eventAction: 'button click',
      eventLabel: 'Sign me up'
    }]);

    // HACK: Yield for fetch-mock promises to complete, because we don't have
    // direct control over that here.
    setTimeout(() => {
      const [url, request] = fetchMock.lastCall(basketUrl);

      expect(url).to.equal(basketUrl);
      expect(request).to.deep.equal({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'newsletters=test-pilot&email=me%40a.b.com&source_url=https%3A%2F%2Fexample.com'
      });

      expect(subject.state('isSuccess')).to.be.true;
      expect(findLocalizedById(subject, 'newsletterFooterSuccessBody')).to.have.length(1);

      expect(sendToGA.lastCall.args).to.deep.equal(['event', {
        eventCategory: 'HomePage Interactions',
        eventAction: 'button click',
        eventLabel: 'email submitted to basket'
      }]);
      done();
    }, 1);
  });

  it('should not submit the email when privacy checkbox is unchecked and <Enter> key is pressed', () => {
    const expectedEmail = 'me@a.b.com';
    subject.setState({ email: expectedEmail, privacy: false });
    subject.find('.modal-container').simulate('keyDown', mockEnterKeyDownEvent);
    expect(sendToGA.notCalled).to.be.true;
    expect(subject.state('isSuccess')).to.be.false;
  });

  it('should subscribe to basket on valid email when <Enter> key is pressed', done => {
    const expectedEmail = 'me@a.b.com';
    subject.setState({ email: expectedEmail, privacy: true });

    fetchMock.post(basketUrl, 200);
    subject.find('.modal-container').simulate('keyDown', mockEnterKeyDownEvent);

    expect(sendToGA.lastCall.args).to.deep.equal(['event', {
      eventCategory: 'HomePage Interactions',
      eventAction: 'button click',
      eventLabel: 'Sign me up'
    }]);

    // HACK: Yield for fetch-mock promises to complete, because we don't have
    // direct control over that here.
    setTimeout(() => {
      const [url, request] = fetchMock.lastCall(basketUrl);

      expect(url).to.equal(basketUrl);
      expect(request).to.deep.equal({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'newsletters=test-pilot&email=me%40a.b.com&source_url=https%3A%2F%2Fexample.com'
      });

      expect(subject.state('isSuccess')).to.be.true;
      expect(findLocalizedById(subject, 'newsletterFooterSuccessBody')).to.have.length(1);

      expect(sendToGA.lastCall.args).to.deep.equal(['event', {
        eventCategory: 'HomePage Interactions',
        eventAction: 'button click',
        eventLabel: 'email submitted to basket'
      }]);
      done();
    }, 1);
  });

  it('should show an error page on error', done => {
    const expectedEmail = 'me@a.b.com';
    subject.setState({ email: expectedEmail });

    fetchMock.post(basketUrl, 500);
    subject.instance().handleSubscribe(expectedEmail);

    expect(sendToGA.lastCall.args).to.deep.equal(['event', {
      eventCategory: 'HomePage Interactions',
      eventAction: 'button click',
      eventLabel: 'Sign me up'
    }]);

    setTimeout(() => {
      expect(subject.state('isError')).to.be.true;
      expect(findLocalizedById(subject, 'newsletterFooterError')).to.have.length(1);
      done();
    }, 1);
  });

  it('should reset the email dialog when the <Enter> key is pressed ' +
    'on the error page', () => {
    subject.setState({ isSuccess: false, isError: true });

    const footer = findLocalizedById(subject, 'newsletterFooterError');
    expect(footer).to.have.length(1);

    const button = subject.findWhere(el => 'email-success-continue' === el.props()['id']);
    expect(button).to.have.length(1);

    subject.find('.modal-container').simulate('keyDown', mockEnterKeyDownEvent);

    expect(subject.state('isSuccess')).to.be.false;
    expect(subject.state('isError')).to.be.false;
  });


  it('should dismiss when continue button is clicked after subscribe', () => {
    subject.setState({ isSuccess: true, isError: false });

    expect(findLocalizedById(subject, 'newsletterFooterSuccessBody')).to.have.length(1);

    const button = subject.findWhere(el => 'email-success-continue' === el.props()['id']);
    expect(button).to.have.length(1);

    button.simulate('click', mockClickEvent);
    expect(onDismiss.called).to.be.true;
    expect(sendToGA.lastCall.args).to.deep.equal(['event', {
      eventCategory: 'HomePage Interactions',
      eventAction: 'button click',
      eventLabel: 'On to the experiments'
    }]);
  });

  it('should dismiss when <Escape> key is pressed, after subscribe', () => {
    subject.setState({ isSuccess: true, isError: false });

    expect(findLocalizedById(subject, 'newsletterFooterSuccessBody')).to.have.length(1);

    const button = subject.findWhere(el => 'email-success-continue' === el.props()['id']);
    expect(button).to.have.length(1);

    subject.find('.modal-container').simulate('keyDown', mockEscapeKeyDownEvent);
    expect(onDismiss.called).to.be.true;
    expect(sendToGA.lastCall.args).to.deep.equal(['event', {
      eventCategory: 'HomePage Interactions',
      eventAction: 'button click',
      eventLabel: 'On to the experiments'
    }]);
  });
});
