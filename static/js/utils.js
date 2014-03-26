Ractive.delimiters = ['<%', '%>'];


/*
  @param {string} id: id of <script type="text/ractive"> tag
*/
function component(id, settings) {
  var templateEl = document.getElementById(id),
      options = settings || {};

  options.template = Ractive.parse(templateEl.innerHTML);
  options.el = document.createElement('div');
  options.el.id = id;

  templateEl.remove();
  return new Ractive(options);
}


module.exports = {
  Ractive: Ractive,
  request: superagent,
  component: component
};
